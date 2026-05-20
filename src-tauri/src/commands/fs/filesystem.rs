use serde::Serialize;

// === Data Structure ===
#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub last_modified: u64,  // Millisecond timestamp
    pub permissions: String, // rwxr-xr-x
    pub owner: String,
    pub group: String,
    pub extension: String,
}

// === Core Abstract Interface ===
// All file system operations should be asynchronous.
#[async_trait::async_trait]
pub trait FileSystem {
    async fn read_dir(&self, path: &str) -> Result<Vec<FileEntry>, String>;
    async fn mkdir(&self, path: &str) -> Result<(), String>;
    async fn create_file(&self, path: &str) -> Result<(), String>;
    async fn rename(&self, old_path: &str, new_path: &str) -> Result<(), String>;
    async fn delete(&self, path: &str, is_dir: bool) -> Result<(), String>;

    // Copy: Source Path -> Destination Path
    async fn copy(&self, from_path: &str, to_path: &str) -> Result<(), String>;

    // Transfer
    async fn download(&self, remote_path: &str, local_path: &str) -> Result<(), String>;
    async fn upload(&self, local_path: &str, remote_path: &str) -> Result<(), String>;

    // Permissions
    async fn chmod(&self, path: &str, mode: &str, recursive: bool) -> Result<(), String>;

    // Text Read/Write
    async fn read_text(&self, path: &str) -> Result<String, String>;
    async fn write_text(&self, path: &str, content: &str) -> Result<(), String>;
    async fn get_home_dir(&self) -> Result<String, String>;
}
