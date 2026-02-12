use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use crate::models::backup::CommandResult;
use crate::utils::crypto::{encrypt_data, decrypt_data};

fn get_credentials_path<R: Runtime>(app: &AppHandle<R>) -> CommandResult<PathBuf> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    Ok(config_dir.join(".webdav_secret"))
}

pub fn save_password<R: Runtime>(app: &AppHandle<R>, password: &str) -> CommandResult<()> {
    let path = get_credentials_path(app)?;
    let encrypted = encrypt_data(password);
    fs::write(path, encrypted).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_password<R: Runtime>(app: &AppHandle<R>) -> CommandResult<String> {
    let path = get_credentials_path(app)?;
    if !path.exists() {
        return Err("No password stored locally".to_string());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    decrypt_data(&content)
}