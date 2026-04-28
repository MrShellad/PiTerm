use super::filesystem::{FileEntry, FileSystem}; // Ensure imports match
use crate::utils::ssh_log::{self, SshLogRecord};
use ssh2::Session;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::time::{Duration, Instant};

const TRANSFER_BUFFER_SIZE: usize = 128 * 1024;
const TRANSFER_PROGRESS_INTERVAL: Duration = Duration::from_millis(150);

pub struct SftpFileSystem<'a> {
    session: &'a Session,
}

impl<'a> SftpFileSystem<'a> {
    pub fn new(session: &'a Session) -> Self {
        Self { session }
    }

    fn copy_with_progress<R, W, F>(
        mut reader: R,
        mut writer: W,
        total: u64,
        mut on_progress: F,
    ) -> Result<(), String>
    where
        R: Read,
        W: Write,
        F: FnMut(u64, u64),
    {
        let mut buffer = vec![0_u8; TRANSFER_BUFFER_SIZE];
        let mut transferred = 0_u64;
        let mut last_emit = Instant::now() - TRANSFER_PROGRESS_INTERVAL;
        let mut last_reported = 0_u64;

        on_progress(0, total);

        loop {
            let read_len = reader
                .read(&mut buffer)
                .map_err(|e| format!("Read stream failed: {}", e))?;
            if read_len == 0 {
                break;
            }

            writer
                .write_all(&buffer[..read_len])
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
            .map_err(|e| format!("Flush stream failed: {}", e))?;
        if transferred != last_reported {
            on_progress(transferred, total);
        }

        Ok(())
    }

    pub fn download_with_progress<F>(
        &self,
        remote_path: &str,
        local_path: &str,
        on_progress: F,
    ) -> Result<(), String>
    where
        F: FnMut(u64, u64),
    {
        self.session.set_timeout(0);

        let result = (|| {
            let sftp = self.session.sftp().map_err(|e| e.to_string())?;
            let remote_path = Path::new(remote_path);
            let mut remote_file = sftp
                .open(remote_path)
                .map_err(|e| format!("Open remote failed: {}", e))?;
            let total = remote_file
                .stat()
                .ok()
                .and_then(|stat| stat.size)
                .unwrap_or(0);
            let local_file =
                File::create(local_path).map_err(|e| format!("Create local failed: {}", e))?;

            Self::copy_with_progress(&mut remote_file, local_file, total, on_progress)
                .map_err(|e| format!("Download failed: {}", e))
        })();

        self.session.set_timeout(3000);
        result
    }

    pub fn upload_with_progress<F>(
        &self,
        local_path: &str,
        remote_path: &str,
        on_progress: F,
    ) -> Result<(), String>
    where
        F: FnMut(u64, u64),
    {
        self.session.set_timeout(0);

        let result = (|| {
            let total = std::fs::metadata(local_path)
                .map_err(|e| format!("Read local metadata failed: {}", e))?
                .len();
            let mut local_file =
                File::open(local_path).map_err(|e| format!("Open local failed: {}", e))?;
            let sftp = self.session.sftp().map_err(|e| e.to_string())?;
            let remote_file = sftp
                .create(Path::new(remote_path))
                .map_err(|e| format!("Create remote failed: {}", e))?;

            Self::copy_with_progress(&mut local_file, remote_file, total, on_progress)
                .map_err(|e| format!("Upload failed: {}", e))
        })();

        self.session.set_timeout(3000);
        result
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

impl<'a> FileSystem for SftpFileSystem<'a> {
    fn read_dir(&self, path: &str) -> Result<Vec<FileEntry>, String> {
        // [Optimization] 1. Set handshake timeout (3s)
        self.session.set_timeout(3000);

        // [Optimization] 2. Try to init SFTP
        let sftp_result = self.session.sftp();

        // Reset timeout regardless of success/failure
        self.session.set_timeout(0);

        let sftp = match sftp_result {
            Ok(s) => s,
            Err(e) => {
                ssh_log::warn(
                    SshLogRecord::new(
                        "ssh.sftp",
                        "sftp_init_failed",
                        "SFTP subsystem initialization failed",
                    )
                    .field("remote_path", path.to_string())
                    .field("error_code", format!("{:?}", e.code()))
                    .field("error", e.to_string()),
                );
                let msg = e.to_string().to_lowercase();
                if msg.contains("wait for response") || msg.contains("timeout") {
                    return Err("SFTP Connection Timed Out. (Server response slow)".to_string());
                }
                return Err(
                    "SFTP not enabled on this server. (Please install openssh-sftp-server)"
                        .to_string(),
                );
            }
        };

        let dir_path = Path::new(path);

        // Reading large dirs might take longer, give 5s
        self.session.set_timeout(5000);
        let paths_result = sftp.readdir(dir_path);
        self.session.set_timeout(0);

        let paths = paths_result.map_err(|e| format!("Read Dir Error: {}", e))?;
        let mut entries = Vec::new();

        for (path_buf, stat) in paths {
            let file_name = path_buf
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if file_name == "." || file_name == ".." {
                continue;
            }

            let is_dir = stat.is_dir();
            let full_path = if path.ends_with('/') {
                format!("{}{}", path, file_name)
            } else {
                format!("{}/{}", path, file_name)
            };

            let extension = path_buf
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let perms_str = if is_dir {
                format!("d{}", Self::format_permissions(stat.perm.unwrap_or(0)))
            } else {
                format!("-{}", Self::format_permissions(stat.perm.unwrap_or(0)))
            };

            entries.push(FileEntry {
                name: file_name,
                path: full_path,
                is_dir,
                size: stat.size.unwrap_or(0),
                last_modified: stat.mtime.unwrap_or(0) * 1000,
                permissions: perms_str,
                owner: stat.uid.unwrap_or(0).to_string(),
                group: stat.gid.unwrap_or(0).to_string(),
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

    fn mkdir(&self, path: &str) -> Result<(), String> {
        self.session.set_timeout(5000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;
        let res = sftp.mkdir(Path::new(path), 0o755);
        self.session.set_timeout(0);
        res.map_err(|e| e.to_string())
    }

    fn create_file(&self, path: &str) -> Result<(), String> {
        self.session.set_timeout(5000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;
        let _file = sftp.create(Path::new(path)).map_err(|e| e.to_string())?;
        self.session.set_timeout(0);
        Ok(())
    }

    fn rename(&self, old_path: &str, new_path: &str) -> Result<(), String> {
        self.session.set_timeout(5000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;
        let res = sftp.rename(Path::new(old_path), Path::new(new_path), None);
        self.session.set_timeout(0);
        res.map_err(|e| e.to_string())
    }

    fn delete(&self, path: &str, is_dir: bool) -> Result<(), String> {
        self.session.set_timeout(8000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;
        let p = Path::new(path);
        let res = if is_dir {
            sftp.rmdir(p)
        } else {
            sftp.unlink(p)
        };
        self.session.set_timeout(0);
        res.map_err(|e| e.to_string())
    }

    fn copy(&self, from_path: &str, to_path: &str) -> Result<(), String> {
        self.session.set_timeout(10000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;

        let mut src_file = sftp
            .open(Path::new(from_path))
            .map_err(|e| format!("Failed to open src: {}", e))?;
        let mut dst_file = sftp
            .create(Path::new(to_path))
            .map_err(|e| format!("Failed to create dst: {}", e))?;

        std::io::copy(&mut src_file, &mut dst_file)
            .map_err(|e| format!("Copy stream failed: {}", e))?;
        dst_file
            .flush()
            .map_err(|e| format!("Flush failed: {}", e))?;

        self.session.set_timeout(0);
        Ok(())
    }

    fn download(&self, remote_path: &str, local_path: &str) -> Result<(), String> {
        self.download_with_progress(remote_path, local_path, |_, _| {})
    }

    fn upload(&self, local_path: &str, remote_path: &str) -> Result<(), String> {
        self.upload_with_progress(local_path, remote_path, |_, _| {})
    }

    fn chmod(&self, path: &str, mode: &str, recursive: bool) -> Result<(), String> {
        let mode_num =
            u32::from_str_radix(mode, 8).map_err(|e| format!("Invalid octal mode: {}", e))?;

        if recursive {
            let mut channel = self.session.channel_session().map_err(|e| e.to_string())?;
            let safe_path = path.replace("'", "'\\''");
            let cmd = format!("chmod -R {:03o} '{}'", mode_num, safe_path);

            channel.exec(&cmd).map_err(|e| e.to_string())?;

            let mut output = String::new();
            channel.read_to_string(&mut output).ok();
            channel.wait_close().ok();

            let status = channel.exit_status().unwrap_or(-1);
            if status != 0 {
                return Err(format!("Recursive chmod failed (Exit: {})", status));
            }
        } else {
            self.session.set_timeout(5000);
            let sftp = self.session.sftp().map_err(|e| e.to_string())?;
            let mut stat = sftp.stat(Path::new(path)).map_err(|e| e.to_string())?;
            stat.perm = Some(mode_num);
            sftp.setstat(Path::new(path), stat)
                .map_err(|e| e.to_string())?;
            self.session.set_timeout(0);
        }
        Ok(())
    }

    fn read_text(&self, path: &str) -> Result<String, String> {
        self.session.set_timeout(10000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;
        let mut remote_file = sftp.open(Path::new(path)).map_err(|e| e.to_string())?;

        let stat = remote_file.stat().map_err(|e| e.to_string())?;
        if stat.size.unwrap_or(0) > 5 * 1024 * 1024 {
            return Err("File too large (>5MB)".to_string());
        }

        let mut content = String::new();
        remote_file
            .read_to_string(&mut content)
            .map_err(|e| format!("Read text failed (Binary?): {}", e))?;

        self.session.set_timeout(0);
        Ok(content)
    }

    fn write_text(&self, path: &str, content: &str) -> Result<(), String> {
        self.session.set_timeout(10000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;
        let mut remote_file = sftp.create(Path::new(path)).map_err(|e| e.to_string())?;

        remote_file
            .write_all(content.as_bytes())
            .map_err(|e| e.to_string())?;
        remote_file.flush().map_err(|e| e.to_string())?;

        self.session.set_timeout(0);
        Ok(())
    }
    // 🟢 [新增] 实现获取家目录
    fn get_home_dir(&self) -> Result<String, String> {
        self.session.set_timeout(5000);
        let sftp = self.session.sftp().map_err(|e| e.to_string())?;

        // "." 在 SFTP 中解析为当前工作目录 (通常是 /root 或 /home/user)
        let path = sftp.realpath(Path::new(".")).map_err(|e| e.to_string())?;

        self.session.set_timeout(0);
        Ok(path.to_string_lossy().to_string())
    }
}
