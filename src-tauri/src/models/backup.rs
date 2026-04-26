use serde::{Deserialize, Serialize};

pub type CommandResult<T> = Result<T, String>;

// [新增] 恢复预览信息 (下载后返回给前端)
#[derive(Debug, Serialize, Deserialize)] // 🟢 建议加上 Deserialize，万一以后要传回后端
#[serde(rename_all = "camelCase")]
pub struct RestorePreview {
    pub temp_file_path: String,
    pub metadata: Option<BackupMetadata>,
}

// 🟢 [修改] 同样添加 camelCase
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupMetadata {
    pub version: String,
    pub device_id: String,
    pub device_name: String,
    pub timestamp: i64,
    pub platform: String,
}

// 🟢 [优化] 加上 camelCase 以防万一，保持统一
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub message: String,
    pub progress: f64,
}

// 🟢 [优化] 加上 Deserialize 和 camelCase
// 这样前端传回文件对象给后端时才不会报错
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CloudBackupFile {
    pub name: String,
    pub date: String,
    pub size: String,
}
