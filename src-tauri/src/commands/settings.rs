use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

const SETTINGS_FILE_NAME: &str = "settings.json";
const SETTINGS_BACKUP_FILE_NAME: &str = "settings.json.bak";

#[derive(Default)]
pub struct SettingsFileState {
    lock: Mutex<()>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsMeta {
    platform: String,
    version: String,
    last_updated: String,
}

#[derive(Serialize, Deserialize)]
struct SettingsFile {
    meta: SettingsMeta,
    state: Value,
}

#[tauri::command]
pub fn load_app_settings(
    app: AppHandle,
    state: State<'_, SettingsFileState>,
) -> Result<Option<String>, String> {
    let _guard = state.lock.lock().map_err(|e| e.to_string())?;
    let config_dir = settings_config_dir(&app)?;
    let settings_path = config_dir.join(SETTINGS_FILE_NAME);
    let backup_path = config_dir.join(SETTINGS_BACKUP_FILE_NAME);

    match read_persist_payload(&settings_path) {
        Ok(Some(payload)) => Ok(Some(serialize_payload(&payload)?)),
        Ok(None) => try_load_backup(&settings_path, &backup_path),
        Err(err) => {
            quarantine_corrupt_file(&settings_path)?;
            eprintln!("Failed to read settings.json, trying backup: {err}");
            try_load_backup(&settings_path, &backup_path)
        }
    }
}

#[tauri::command]
pub fn save_app_settings(
    app: AppHandle,
    state: State<'_, SettingsFileState>,
    value: String,
) -> Result<(), String> {
    let payload: Value = serde_json::from_str(&value)
        .map_err(|e| format!("Refusing to save invalid settings payload: {e}"))?;

    if !payload.is_object() {
        return Err("Refusing to save non-object settings payload".to_string());
    }

    let _guard = state.lock.lock().map_err(|e| e.to_string())?;
    let config_dir = settings_config_dir(&app)?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let settings_path = config_dir.join(SETTINGS_FILE_NAME);
    let backup_path = config_dir.join(SETTINGS_BACKUP_FILE_NAME);

    match read_persist_payload(&settings_path) {
        Ok(Some(existing)) if existing == payload => return Ok(()),
        Ok(Some(_)) => {
            fs::copy(&settings_path, &backup_path).map_err(|e| e.to_string())?;
        }
        Ok(None) => {}
        Err(_) => {
            quarantine_corrupt_file(&settings_path)?;
        }
    }

    let file = SettingsFile {
        meta: SettingsMeta {
            platform: std::env::consts::OS.to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            last_updated: Utc::now().to_rfc3339(),
        },
        state: payload,
    };
    let content = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    atomic_write(&settings_path, content.as_bytes())
}

fn settings_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|e| e.to_string())
}

fn serialize_payload(payload: &Value) -> Result<String, String> {
    serde_json::to_string(payload).map_err(|e| e.to_string())
}

fn try_load_backup(settings_path: &Path, backup_path: &Path) -> Result<Option<String>, String> {
    match read_persist_payload(backup_path) {
        Ok(Some(payload)) => {
            let content = fs::read(backup_path).map_err(|e| e.to_string())?;
            atomic_write(settings_path, &content)?;
            Ok(Some(serialize_payload(&payload)?))
        }
        Ok(None) => Ok(None),
        Err(err) => {
            quarantine_corrupt_file(backup_path)?;
            eprintln!("Failed to read settings backup: {err}");
            Ok(None)
        }
    }
}

fn read_persist_payload(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() {
        return Err("settings file is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let payload = if parsed.get("meta").is_some() && parsed.get("state").is_some() {
        parsed
            .get("state")
            .cloned()
            .ok_or_else(|| "settings wrapper is missing state".to_string())?
    } else {
        parsed
    };

    if !payload.is_object() {
        return Err("settings payload is not an object".to_string());
    }

    Ok(Some(payload))
}

fn quarantine_corrupt_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("settings.json");
    let timestamp = Utc::now().format("%Y%m%d%H%M%S%3f");
    let quarantine_path = path.with_file_name(format!("{file_name}.corrupt-{timestamp}"));

    fs::rename(path, quarantine_path).map_err(|e| e.to_string())
}

fn atomic_write(path: &Path, content: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "settings path has no parent directory".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let tmp_path = path.with_file_name(format!(
        ".{}.tmp-{}-{}",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("settings.json"),
        std::process::id(),
        Utc::now().timestamp_nanos_opt().unwrap_or_default()
    ));

    {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&tmp_path)
            .map_err(|e| e.to_string())?;
        file.write_all(content).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }

    match fs::rename(&tmp_path, path) {
        Ok(()) => Ok(()),
        Err(rename_err) if path.exists() => {
            fs::remove_file(path).map_err(|e| e.to_string())?;
            fs::rename(&tmp_path, path).map_err(|e| {
                let _ = fs::remove_file(&tmp_path);
                format!("Failed to replace settings file after {rename_err}: {e}")
            })
        }
        Err(rename_err) => {
            let _ = fs::remove_file(&tmp_path);
            Err(rename_err.to_string())
        }
    }?;

    if let Ok(dir) = File::open(parent) {
        let _ = dir.sync_all();
    }

    Ok(())
}
