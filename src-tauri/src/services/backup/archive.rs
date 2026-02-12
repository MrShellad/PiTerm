use std::fs::{self, File};
use std::io::{Read, Write, Seek};
// 🛑 [移除] Emitter (不再需要发送事件)
use tauri::{AppHandle, Runtime, Manager}; 
use walkdir::WalkDir;
use zip::write::FileOptions;
// 🛑 [移除] ProgressPayload (不再需要)
use crate::models::backup::{BackupMetadata, CommandResult}; 

// 🛑 [删除] 整个 emit_progress 函数
// fn emit_progress<R: Runtime>(app: &AppHandle<R>, msg: &str, progress: f64) { ... }

pub fn pack_config_dir<R: Runtime, W>(
    app: &AppHandle<R>,
    writer: W, 
    metadata: BackupMetadata
) -> CommandResult<()> 
where W: Write + Seek 
{
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    
    let mut zip = zip::ZipWriter::new(writer);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    // 1. 写入元数据
    if let Ok(meta_json) = serde_json::to_string_pretty(&metadata) {
        zip.start_file("backup_meta.json", options).map_err(|e| e.to_string())?;
        zip.write_all(meta_json.as_bytes()).map_err(|e| e.to_string())?;
    }

    // 2. 遍历并打包
    let walk_dir = WalkDir::new(&config_dir);
    for entry in walk_dir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(&config_dir)
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Invalid path encoding")?;
        
        // 🔒 过滤敏感文件
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

pub fn unpack_zip_to_config<R: Runtime, Reader>(
    app: &AppHandle<R>, 
    reader: Reader
) -> CommandResult<()> 
where Reader: Read + Seek 
{
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(reader).map_err(|e| format!("Invalid zip: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        
        if let Some(name) = file.enclosed_name() {
            // 🔒 安全过滤
            if name.to_string_lossy().contains(".webdav_secret") { continue; }
            
            let outpath = config_dir.join(name);

            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() { fs::create_dir_all(p).map_err(|e| e.to_string())?; }
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}