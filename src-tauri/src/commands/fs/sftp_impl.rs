use super::filesystem::{FileEntry, FileSystem};
use russh_sftp::client::SftpSession;
use russh_sftp::protocol::OpenFlags;
use std::time::{Duration, Instant};
use tokio::fs::File as LocalFile;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

const TRANSFER_BUFFER_SIZE: usize = 128 * 1024;
const TRANSFER_PROGRESS_INTERVAL: Duration = Duration::from_millis(150);

pub struct SftpFileSystem<'a> {
    sftp: &'a SftpSession,
}

impl<'a> SftpFileSystem<'a> {
    pub fn new(sftp: &'a SftpSession) -> Self {
        Self { sftp }
    }

    async fn copy_with_progress<R, W, F>(
        mut reader: R,
        mut writer: W,
        total: u64,
        mut on_progress: F,
    ) -> Result<(), String>
    where
        R: tokio::io::AsyncRead + Unpin,
        W: tokio::io::AsyncWrite + Unpin,
        F: FnMut(u64, u64) + Send + 'static,
    {
        let mut buffer = vec![0_u8; TRANSFER_BUFFER_SIZE];
        let mut transferred = 0_u64;
        let mut last_emit = Instant::now() - TRANSFER_PROGRESS_INTERVAL;
        let mut last_reported = 0_u64;

        on_progress(0, total);

        loop {
            let read_len = reader
                .read(&mut buffer)
                .await
                .map_err(|e| format!("Read stream failed: {}", e))?;
            if read_len == 0 {
                break;
            }

            writer
                .write_all(&buffer[..read_len])
                .await
                .map_err(|e| format!("Write stream failed: {}", e))?;

            transferred = transferred.saturating_add(read_len as u64);
            if last_emit.elapsed() >= TRANSFER_PROGRESS_INTERVAL || transferred == total {
                on_progress(transferred, total);
                last_reported = transferred;
                last_emit = Instant::now();
            }
        }

        writer
            .flush()
            .await
            .map_err(|e| format!("Flush stream failed: {}", e))?;
        if transferred != last_reported {
            on_progress(transferred, total);
        }

        Ok(())
    }

    pub async fn download_with_progress<F>(
        &self,
        remote_path: &str,
        local_path: &str,
        on_progress: F,
    ) -> Result<(), String>
    where
        F: FnMut(u64, u64) + Send + 'static,
    {
        let remote_file = self
            .sftp
            .open(remote_path)
            .await
            .map_err(|e| format!("Open remote failed: {}", e))?;
        let stat = self.sftp.metadata(remote_path).await.ok();
        let total = stat.and_then(|s| s.size).unwrap_or(0);
        let local_file = LocalFile::create(local_path)
            .await
            .map_err(|e| format!("Create local failed: {}", e))?;

        Self::copy_with_progress(remote_file, local_file, total, on_progress).await
    }

    pub async fn upload_with_progress<F>(
        &self,
        local_path: &str,
        remote_path: &str,
        on_progress: F,
    ) -> Result<(), String>
    where
        F: FnMut(u64, u64) + Send + 'static,
    {
        let total = tokio::fs::metadata(local_path)
            .await
            .map_err(|e| format!("Read local metadata failed: {}", e))?
            .len();
        let local_file = LocalFile::open(local_path)
            .await
            .map_err(|e| format!("Open local failed: {}", e))?;
        
        let mut open_flags = OpenFlags::empty();
        open_flags.set(OpenFlags::WRITE, true);
        open_flags.set(OpenFlags::CREATE, true);
        open_flags.set(OpenFlags::TRUNCATE, true);

        let remote_file = self
            .sftp
            .open_with_flags(remote_path, open_flags)
            .await
            .map_err(|e| format!("Create remote failed: {}", e))?;

        Self::copy_with_progress(local_file, remote_file, total, on_progress).await
    }

    // === Helper: Unix permissions to string ===
    fn format_permissions(mode: u32) -> String {
        let mut s = String::with_capacity(10);
        s.push(if mode & 0o400 != 0 { 'r' } else { '-' });
        s.push(if mode & 0o200 != 0 { 'w' } else { '-' });
        s.push(if mode & 0o100 != 0 { 'x' } else { '-' });
        s.push(if mode & 0o040 != 0 { 'r' } else { '-' });
        s.push(if mode & 0o020 != 0 { 'w' } else { '-' });
        s.push(if mode & 0o010 != 0 { 'x' } else { '-' });
        s.push(if mode & 0o004 != 0 { 'r' } else { '-' });
        s.push(if mode & 0o002 != 0 { 'w' } else { '-' });
        s.push(if mode & 0o001 != 0 { 'x' } else { '-' });
        s
    }
}

#[async_trait::async_trait]
impl<'a> FileSystem for SftpFileSystem<'a> {
    async fn read_dir(&self, path: &str) -> Result<Vec<FileEntry>, String> {
        let paths = self
            .sftp
            .read_dir(path)
            .await
            .map_err(|e| format!("Read Dir Error: {}", e))?;

        let mut entries = Vec::new();

        for entry in paths {
            let file_name = entry.file_name();
            if file_name == "." || file_name == ".." {
                continue;
            }

            let attrs = entry.metadata();
            let is_dir = attrs.permissions.map(|p| p & 0o170000 == 0o040000).unwrap_or(false);
            
            let full_path = if path.ends_with('/') {
                format!("{}{}", path, file_name)
            } else {
                format!("{}/{}", path, file_name)
            };

            let path_buf = std::path::PathBuf::from(&full_path);
            let extension = path_buf
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let perm_val = attrs.permissions.unwrap_or(0);
            let perms_str = if is_dir {
                format!("d{}", Self::format_permissions(perm_val))
            } else {
                format!("-{}", Self::format_permissions(perm_val))
            };

            entries.push(FileEntry {
                name: file_name.to_string(),
                path: full_path,
                is_dir,
                size: attrs.size.unwrap_or(0),
                last_modified: (attrs.mtime.unwrap_or(0) as u64) * 1000,
                permissions: perms_str,
                owner: attrs.uid.unwrap_or(0).to_string(),
                group: attrs.gid.unwrap_or(0).to_string(),
                extension,
            });
        }

        // Sorting
        entries.sort_by(|a, b| {
            if a.is_dir == b.is_dir {
                a.name.cmp(&b.name)
            } else {
                b.is_dir.cmp(&a.is_dir)
            }
        });

        Ok(entries)
    }

    async fn mkdir(&self, path: &str) -> Result<(), String> {
        self.sftp
            .create_dir(path)
            .await
            .map_err(|e| e.to_string())?;
            
        let mut attrs = russh_sftp::protocol::FileAttributes::default();
        attrs.permissions = Some(0o755);
        self.sftp.set_metadata(path, attrs).await.ok();
        Ok(())
    }

    async fn create_file(&self, path: &str) -> Result<(), String> {
        let mut open_flags = OpenFlags::empty();
        open_flags.set(OpenFlags::WRITE, true);
        open_flags.set(OpenFlags::CREATE, true);
        open_flags.set(OpenFlags::TRUNCATE, true);
        
        let _file = self.sftp
            .open_with_flags(path, open_flags)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn rename(&self, old_path: &str, new_path: &str) -> Result<(), String> {
        self.sftp
            .rename(old_path, new_path)
            .await
            .map_err(|e| e.to_string())
    }

    async fn delete(&self, path: &str, is_dir: bool) -> Result<(), String> {
        if is_dir {
            self.sftp.remove_dir(path).await
        } else {
            self.sftp.remove_file(path).await
        }
        .map_err(|e| e.to_string())
    }

    async fn copy(&self, from_path: &str, to_path: &str) -> Result<(), String> {
        let src_file = self.sftp
            .open(from_path)
            .await
            .map_err(|e| format!("Failed to open src: {}", e))?;
            
        let mut open_flags = OpenFlags::empty();
        open_flags.set(OpenFlags::WRITE, true);
        open_flags.set(OpenFlags::CREATE, true);
        open_flags.set(OpenFlags::TRUNCATE, true);
        
        let dst_file = self.sftp
            .open_with_flags(to_path, open_flags)
            .await
            .map_err(|e| format!("Failed to create dst: {}", e))?;

        Self::copy_with_progress(src_file, dst_file, 0, |_, _| {}).await
    }

    async fn download(&self, remote_path: &str, local_path: &str) -> Result<(), String> {
        self.download_with_progress(remote_path, local_path, |_, _| {}).await
    }

    async fn upload(&self, local_path: &str, remote_path: &str) -> Result<(), String> {
        self.upload_with_progress(local_path, remote_path, |_, _| {}).await
    }

    async fn chmod(&self, path: &str, mode: &str, recursive: bool) -> Result<(), String> {
        let mode_num =
            u32::from_str_radix(mode, 8).map_err(|e| format!("Invalid octal mode: {}", e))?;

        if recursive {
            let mut stack = vec![path.to_string()];
            while let Some(current_path) = stack.pop() {
                let mut stat = self.sftp.metadata(&current_path).await.map_err(|e| e.to_string())?;
                stat.permissions = Some(mode_num);
                self.sftp.set_metadata(&current_path, stat).await.map_err(|e| e.to_string())?;

                if let Ok(entries) = self.sftp.read_dir(&current_path).await {
                    for entry in entries {
                        if entry.file_name() != "." && entry.file_name() != ".." {
                            let attrs = entry.metadata();
                            let is_dir = attrs.permissions.map(|p| p & 0o170000 == 0o040000).unwrap_or(false);
                            let full_path = format!("{}/{}", current_path, entry.file_name());
                            if is_dir {
                                stack.push(full_path);
                            } else {
                                let mut file_stat = attrs.clone();
                                file_stat.permissions = Some(mode_num);
                                self.sftp.set_metadata(&full_path, file_stat).await.ok();
                            }
                        }
                    }
                }
            }
        } else {
            let mut stat = self.sftp.metadata(path).await.map_err(|e| e.to_string())?;
            stat.permissions = Some(mode_num);
            self.sftp.set_metadata(path, stat)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn read_text(&self, path: &str) -> Result<String, String> {
        let mut remote_file = self.sftp.open(path).await.map_err(|e| e.to_string())?;

        let stat = self.sftp.metadata(path).await.map_err(|e| e.to_string())?;
        if stat.size.unwrap_or(0) > 5 * 1024 * 1024 {
            return Err("File too large (>5MB)".to_string());
        }

        let mut content = String::new();
        remote_file
            .read_to_string(&mut content)
            .await
            .map_err(|e| format!("Read text failed (Binary?): {}", e))?;

        Ok(content)
    }

    async fn write_text(&self, path: &str, content: &str) -> Result<(), String> {
        let mut open_flags = OpenFlags::empty();
        open_flags.set(OpenFlags::WRITE, true);
        open_flags.set(OpenFlags::CREATE, true);
        open_flags.set(OpenFlags::TRUNCATE, true);
        
        let mut remote_file = self.sftp.open_with_flags(path, open_flags).await.map_err(|e| e.to_string())?;

        remote_file
            .write_all(content.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        remote_file.flush().await.map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_home_dir(&self) -> Result<String, String> {
        let path = self.sftp.canonicalize(".").await.map_err(|e| e.to_string())?;
        Ok(path)
    }
}
