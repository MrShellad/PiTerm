use std::fs::{self, File};
use std::io::{Read, Write, Cursor};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use walkdir::WalkDir;
use zip::write::FileOptions;
use reqwest::Client;
use chrono::Local;
use base64::{Engine as _, engine::general_purpose};
use serde::Serialize; 
use regex::Regex;

type CommandResult<T> = Result<T, String>;

// =================================================================
// 🟢 [新增] 备份元数据结构 (写入 zip 内部)
// =================================================================
#[derive(Serialize)]
struct BackupMetadata {
    version: String,
    device_id: String,
    device_name: String,
    timestamp: i64,
    platform: String,
}

// =================================================================
// 🔐 安全存储模块 (保持不变)
// =================================================================

fn get_credentials_path<R: Runtime>(app: &AppHandle<R>) -> CommandResult<PathBuf> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    Ok(config_dir.join(".webdav_secret"))
}

fn encrypt_data(data: &str) -> String {
    let salted = format!("_SALT_{}_END_", data);
    general_purpose::STANDARD.encode(salted)
}

fn decrypt_data(data: &str) -> CommandResult<String> {
    let decoded_bytes = general_purpose::STANDARD.decode(data).map_err(|_| "Decode failed".to_string())?;
    let decoded_str = String::from_utf8(decoded_bytes).map_err(|_| "Invalid UTF-8".to_string())?;
    
    let prefix = "_SALT_";
    let suffix = "_END_";
    if decoded_str.starts_with(prefix) && decoded_str.ends_with(suffix) {
        Ok(decoded_str[prefix.len()..decoded_str.len() - suffix.len()].to_string())
    } else {
        Err("Data corruption".to_string())
    }
}

#[tauri::command]
pub async fn save_webdav_password<R: Runtime>(app: AppHandle<R>, password: String) -> CommandResult<()> {
    let path = get_credentials_path(&app)?;
    let encrypted = encrypt_data(&password);
    fs::write(path, encrypted).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_webdav_password<R: Runtime>(app: &AppHandle<R>) -> CommandResult<String> {
    let path = get_credentials_path(app)?;
    if !path.exists() {
        return Err("No password stored locally".to_string());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    decrypt_data(&content)
}

// =================================================================
// 🚀 业务命令
// =================================================================

/// 1. 检查 WebDAV (保持不变)
#[tauri::command]
pub async fn check_webdav<R: Runtime>(
    app: AppHandle<R>,
    url: String, 
    username: String, 
    password: Option<String> 
) -> CommandResult<String> {
    
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => load_webdav_password(&app).map_err(|_| "Password required (not saved locally)".to_string())?
    };

    let client = Client::new();
    let res = client.request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
        .basic_auth(username, Some(actual_password))
        .header("Depth", "0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if res.status().is_success() || res.status().as_u16() == 207 {
        Ok("Connection successful".to_string())
    } else {
        Err(format!("Server returned status: {}", res.status()))
    }
}

/// 2. 创建备份 (🟢 已修改: 支持 device_name 和 device_id)
#[tauri::command]
pub async fn create_cloud_backup<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
    // 🟢 [新增] 接收前端传来的设备信息
    device_name: String,
    device_id: String
) -> CommandResult<String> {
    
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => load_webdav_password(&app)?
    };

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        return Err("Config directory does not exist".to_string());
    }

    let now = Local::now();
    
    // 🟢 [新增] 净化文件名 (只保留字母数字和下划线/短横线)
    // 防止用户设置的设备名包含 / \ : 等导致文件系统错误
    let re_sanitize = Regex::new(r"[^a-zA-Z0-9\-_]").unwrap();
    let safe_device_name = re_sanitize.replace_all(&device_name, "");
    
    // 🟢 [修改] 格式: backup_MyPC_2024-01-01_120000.zip
    let filename = format!(
        "backup_{}_{}.zip", 
        safe_device_name,
        now.format("%Y-%m-%d_%H%M%S")
    );
    
    let temp_dir = std::env::temp_dir();
    let zip_path = temp_dir.join(&filename);
    let file = File::create(&zip_path).map_err(|e| e.to_string())?;
    
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    // 🟢 [新增] 写入 backup_meta.json 到 zip 根目录
    // 即使文件名被修改，解压后的 meta 文件仍能证明身份
    let meta = BackupMetadata {
        version: "1.0.0".to_string(),
        device_id,
        device_name,
        timestamp: now.timestamp_millis(),
        platform: std::env::consts::OS.to_string(),
    };
    
    // 将 meta 转为 json 字符串并写入 zip
    if let Ok(meta_json) = serde_json::to_string_pretty(&meta) {
        zip.start_file("backup_meta.json", options).map_err(|e| e.to_string())?;
        zip.write_all(meta_json.as_bytes()).map_err(|e| e.to_string())?;
    }

    // 遍历真实配置目录
    let walk_dir = WalkDir::new(&config_dir);
    for entry in walk_dir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        let name = path.strip_prefix(&config_dir)
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Invalid path encoding")?;
        
        // 🔒 安全过滤
        if name.contains(".webdav_secret") || name.contains(".credentials") {
            continue;
        }

        if path.is_file() {
            zip.start_file(name, options).map_err(|e| e.to_string())?;
            let mut f = File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        } else if !name.is_empty() {
            zip.add_directory(name, options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;

    // 上传
    let file_content = fs::read(&zip_path).map_err(|e| e.to_string())?;
    let upload_url = format!("{}/{}", url.trim_end_matches('/'), filename);

    let client = Client::new();
    let res = client.put(&upload_url)
        .basic_auth(username, Some(actual_password))
        .body(file_content)
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;
        
    let _ = fs::remove_file(zip_path);

    if res.status().is_success() || res.status().as_u16() == 201 || res.status().as_u16() == 204 {
        Ok(format!("Backup uploaded: {}", filename))
    } else {
        Err(format!("WebDAV upload failed: {}", res.status()))
    }
}

// 备份文件的数据结构
#[derive(Serialize, Debug)]
pub struct CloudBackupFile {
    name: String,
    date: String,
    size: String,
}

/// 3. 获取列表 (保持不变，已兼容新文件名)
#[tauri::command]
pub async fn get_backup_list<R: Runtime>(
    app: AppHandle<R>,
    url: String, 
    username: String, 
    password: Option<String>
) -> CommandResult<Vec<CloudBackupFile>> {
    
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => load_webdav_password(&app)?
    };

    let client = Client::new();
    let res = client.request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
        .basic_auth(username, Some(actual_password))
        .header("Depth", "1")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() && res.status().as_u16() != 207 {
         return Err(format!("Failed to list files: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    let re_response = Regex::new(r"(?s)<[\w:]*response>(.*?)</[\w:]*response>").unwrap();
    let re_href = Regex::new(r"<[\w:]*href>(.*?)</[\w:]*href>").unwrap();
    let re_size = Regex::new(r"<[\w:]*getcontentlength[^>]*>(\d+)</[\w:]*getcontentlength>").unwrap();
    let re_date = Regex::new(r"<[\w:]*getlastmodified[^>]*>(.*?)</[\w:]*getlastmodified>").unwrap();

    for cap in re_response.captures_iter(&body) {
        let block = &cap[1];
        
        let full_path = match re_href.captures(block) {
            Some(c) => c[1].to_string(),
            None => continue,
        };
        
        let decoded_path = urlencoding::decode(&full_path).unwrap_or(std::borrow::Cow::Borrowed(&full_path)).to_string();
        let name = decoded_path.trim_end_matches('/').split('/').last().unwrap_or("unknown").to_string();

        // 🟢 正则匹配只要是 backup_ 开头且 .zip 结尾即可，兼容新旧格式
        if !name.starts_with("backup_") || !name.ends_with(".zip") {
            continue;
        }

        let size_bytes: u64 = re_size.captures(block)
            .map(|c| c[1].parse().unwrap_or(0))
            .unwrap_or(0);
        let size = format!("{:.2} MB", size_bytes as f64 / 1024.0 / 1024.0);

        let date = re_date.captures(block)
            .map(|c| c[1].to_string())
            .unwrap_or("Unknown".to_string());

        files.push(CloudBackupFile { name, date, size });
    }

    files.sort_by(|a, b| b.name.cmp(&a.name));

    Ok(files)
}

/// 4. 删除备份 (保持不变)
#[tauri::command]
pub async fn delete_cloud_backup<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
    filename: String
) -> CommandResult<String> {
    
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => load_webdav_password(&app)?
    };

    let delete_url = format!("{}/{}", url.trim_end_matches('/'), filename);
    let client = Client::new();
    
    let res = client.delete(&delete_url)
        .basic_auth(username, Some(actual_password))
        .send()
        .await
        .map_err(|e| format!("Delete failed: {}", e))?;

    if res.status().is_success() || res.status().as_u16() == 204 {
        Ok("Deleted successfully".to_string())
    } else {
        Err(format!("Server returned status: {}", res.status()))
    }
}

/// 5. 恢复备份 (保持不变，直接覆盖)
#[tauri::command]
pub async fn restore_cloud_backup<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    username: String,
    password: Option<String>,
    filename: String
) -> CommandResult<String> {
    
    let actual_password = match password {
        Some(p) if !p.is_empty() => p,
        _ => load_webdav_password(&app)?
    };

    let client = Client::new();
    let download_url = format!("{}/{}", url.trim_end_matches('/'), filename);

    let res = client.get(&download_url)
        .basic_auth(username, Some(actual_password))
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Server error: {}", res.status()));
    }

    let content = res.bytes().await.map_err(|e| e.to_string())?;

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let reader = Cursor::new(content);
    let mut archive = zip::ZipArchive::new(reader).map_err(|e| format!("Invalid zip: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        
        if let Some(name) = file.enclosed_name() {
            // 🟢 [保护] 恢复时忽略 webdav 密钥
            if name.to_string_lossy().contains(".webdav_secret") {
                continue;
            }
            // 🟢 [可选] 也可以选择忽略 backup_meta.json，不让它污染本地配置目录
            // if name.to_string_lossy().contains("backup_meta.json") { continue; }

            let outpath = config_dir.join(name);

            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p).map_err(|e| e.to_string())?;
                    }
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok("Restore successful. Please restart the app.".to_string())
}

#[tauri::command]
pub async fn export_local_backup<R: Runtime>(app: AppHandle<R>, target_path: String) -> CommandResult<()> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    
    // 1. 尝试从 settings.json 读取设备信息 (保持元数据一致)
    // 如果读取失败，使用默认值
    let (device_name, device_id) = {
        let settings_path = config_dir.join("settings.json");
        let mut d_name = "Local Export".to_string();
        let mut d_id = "unknown".to_string();

        if let Ok(content) = fs::read_to_string(&settings_path) {
            // 简单解析 JSON，路径基于 zustand persist 结构: { state: { settings: { ... } } }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(settings) = json.get("state").and_then(|s| s.get("settings")) {
                     if let Some(n) = settings.get("general.deviceName").and_then(|v| v.as_str()) {
                         d_name = n.to_string();
                     }
                     if let Some(i) = settings.get("general.deviceId").and_then(|v| v.as_str()) {
                         d_id = i.to_string();
                     }
                }
            }
        }
        (d_name, d_id)
    };

    // 2. 创建目标 Zip 文件
    let file = File::create(&target_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    // 3. 写入元数据 (backup_meta.json)
    let now = Local::now();
    let meta = BackupMetadata {
        version: "1.0.0".to_string(),
        device_id,
        device_name,
        timestamp: now.timestamp_millis(),
        platform: std::env::consts::OS.to_string(),
    };
    
    if let Ok(meta_json) = serde_json::to_string_pretty(&meta) {
        zip.start_file("backup_meta.json", options).map_err(|e| e.to_string())?;
        zip.write_all(meta_json.as_bytes()).map_err(|e| e.to_string())?;
    }

    // 4. 遍历并打包配置目录 (与云备份逻辑一致)
    let walk_dir = WalkDir::new(&config_dir);
    for entry in walk_dir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        let name = path.strip_prefix(&config_dir)
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Invalid path encoding")?;
        
        // 🔒 安全过滤：不导出 WebDAV 密钥
        if name.contains(".webdav_secret") || name.contains(".credentials") {
            continue;
        }

        if path.is_file() {
            zip.start_file(name, options).map_err(|e| e.to_string())?;
            let mut f = File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        } else if !name.is_empty() {
            zip.add_directory(name, options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;

    Ok(())
}

// 🟢 [新增] 从本地文件导入
#[tauri::command]
pub async fn import_local_backup<R: Runtime>(app: AppHandle<R>, file_path: String) -> CommandResult<()> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    
    // 1. 打开本地文件
    let file = File::open(&file_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid zip: {}", e))?;

    // 2. 遍历解压
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        
        if let Some(name) = file.enclosed_name() {
            // 🔒 保护：恢复时忽略敏感文件 (虽然导出时已过滤，但防止恶意 Zip)
            if name.to_string_lossy().contains(".webdav_secret") {
                continue;
            }
            
            let outpath = config_dir.join(name);

            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p).map_err(|e| e.to_string())?;
                    }
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}