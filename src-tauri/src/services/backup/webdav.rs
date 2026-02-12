use tauri::{AppHandle, Runtime, Emitter};
use reqwest::Client;
use regex::Regex;
use crate::models::backup::{CommandResult, CloudBackupFile, ProgressPayload};

fn emit_progress<R: Runtime>(app: &AppHandle<R>, msg: &str, progress: f64) {
    let _ = app.emit("backup_progress", ProgressPayload {
        message: msg.to_string(),
        progress,
    });
}

pub async fn check_connection(url: &str, username: &str, password: &str) -> CommandResult<()> {
    let client = Client::new();
    let res = client.request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), url)
        .basic_auth(username, Some(password))
        .header("Depth", "0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if res.status().is_success() || res.status().as_u16() == 207 {
        Ok(())
    } else {
        Err(format!("Server returned status: {}", res.status()))
    }
}

pub async fn upload_file<R: Runtime>(
    _app: &AppHandle<R>,
    url: &str, 
    username: &str, 
    password: &str, 
    filename: &str,
    file_content: Vec<u8>
) -> CommandResult<()> {
    let upload_url = format!("{}/{}", url.trim_end_matches('/'), filename);
    let client = Client::new();
    
    // WebDAV PUT 通常没有内置进度，如果需要精确进度需使用 Body Stream
    // 这里简单处理
    let res = client.put(&upload_url)
        .basic_auth(username, Some(password))
        .body(file_content)
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;

    if res.status().is_success() || res.status().as_u16() == 201 || res.status().as_u16() == 204 {
        Ok(())
    } else {
        Err(format!("WebDAV upload failed: {}", res.status()))
    }
}

pub async fn download_file<R: Runtime>(
    app: &AppHandle<R>,
    url: &str,
    username: &str,
    password: &str,
    filename: &str
) -> CommandResult<Vec<u8>> {
    let download_url = format!("{}/{}", url.trim_end_matches('/'), filename);
    let client = Client::new();

    let mut res = client.get(&download_url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Server error: {}", res.status()));
    }

    // 精确进度下载
    let total_size = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut content = Vec::new();
    
    emit_progress(app, "backup.progress.downloading", 20.0);

    while let Some(chunk) = res.chunk().await.map_err(|e| format!("Chunk error: {}", e))? {
        content.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;
        
        let pct = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 60.0 // 20% -> 80%
        } else {
            30.0 
        };
        emit_progress(app, "backup.progress.downloading", 20.0 + pct);
    }

    Ok(content)
}

pub async fn list_files(url: &str, username: &str, password: &str) -> CommandResult<Vec<CloudBackupFile>> {
    let client = Client::new();
    let res = client.request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), url)
        .basic_auth(username, Some(password))
        .header("Depth", "1")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() && res.status().as_u16() != 207 {
         return Err(format!("Failed to list files: {}", res.status()));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    // Regex parsing (same as before)
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

        if !name.starts_with("backup_") || !name.ends_with(".zip") { continue; }

        let size_bytes: u64 = re_size.captures(block).map(|c| c[1].parse().unwrap_or(0)).unwrap_or(0);
        let size = format!("{:.2} MB", size_bytes as f64 / 1024.0 / 1024.0);
        let date = re_date.captures(block).map(|c| c[1].to_string()).unwrap_or("Unknown".to_string());

        files.push(CloudBackupFile { name, date, size });
    }
    
    files.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(files)
}

pub async fn delete_file(url: &str, username: &str, password: &str, filename: &str) -> CommandResult<()> {
    let delete_url = format!("{}/{}", url.trim_end_matches('/'), filename);
    let client = Client::new();
    let res = client.delete(&delete_url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("Delete failed: {}", e))?;

    if res.status().is_success() || res.status().as_u16() == 204 {
        Ok(())
    } else {
        Err(format!("Status: {}", res.status()))
    }
}