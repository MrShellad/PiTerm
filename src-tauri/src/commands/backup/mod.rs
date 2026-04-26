// src-tauri/src/commands/backup/mod.rs

// 1. 声明子模块 (告诉 Rust 这些文件的存在)
pub mod create;
pub mod credentials;
pub mod delete;
pub mod export;
pub mod import;
pub mod list;
pub mod restore;
pub mod webdav;

// 2. 🟢 [关键修复] 重新导出 (Re-export)
// 这一步将 commands::backup::create::create_cloud_backup
// 映射为 commands::backup::create_cloud_backup
// 这样 lib.rs 里的 use commands::backup::*; 才能生效！

pub use create::create_cloud_backup;
pub use credentials::save_webdav_password;
pub use delete::delete_cloud_backup;
pub use export::export_local_backup;
pub use import::import_local_backup;
pub use list::get_backup_list;
pub use restore::{apply_restore_file, prepare_cloud_restore};
pub use webdav::check_webdav;
