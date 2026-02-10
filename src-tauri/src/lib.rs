pub mod commands;
pub mod models;
pub mod db;
pub mod state;

use tauri::{AppHandle, Manager, WindowEvent};
use std::sync::Mutex;
use crate::state::AppState;
use commands::monitor::MonitorCache;
use commands::ssh::SshState;
use commands::vault::VaultState;

// 🟢 [优化] 仅在桌面端引入托盘和菜单相关引用
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem, MenuEvent},
    tray::{TrayIcon, TrayIconBuilder, TrayIconEvent},
};
#[cfg(desktop)]
use tauri_plugin_autostart::MacosLauncher;

// ================================
// 引入 Server 相关命令
// ================================
use commands::fs::{
    list_ssh_files, sftp_copy, sftp_create_file, sftp_delete, sftp_download_file, sftp_mkdir,
    sftp_rename, sftp_upload_file, sftp_chmod, sftp_write_file, sftp_read_file,
};
use commands::server::*;
use commands::backup::*;
use commands::ssh::*;
use commands::history::*;
use commands::vault::{
    add_key, delete_key, get_all_keys, get_decrypted_content, init_vault, lock_vault, unlock_vault, get_vault_status, check_key_associations
};
use commands::snippet::*;
use commands::monitor::{
    get_ssh_cpu_info, get_ssh_mem_info, get_ssh_disk_info, get_ssh_os_info, get_ssh_network_info,
};
use commands::proxy::{add_proxy, get_all_proxies, update_proxy, delete_proxy};

// 🔴 [注意] 如果你已经删除了 font-kit，建议把 system 模块也检查一下
// 如果 system 模块里有依赖 font-kit 的代码，请确保也加上了 #[cfg(desktop)]
use commands::system::*;

pub struct WindowConfigState {
    pub minimize_to_tray: Mutex<bool>,
    pub close_behavior: Mutex<String>, 
}

#[tauri::command]
fn update_app_config(
    state: tauri::State<'_, WindowConfigState>,
    minimize_to_tray: bool,
    close_behavior: String,
) {
    *state.minimize_to_tray.lock().unwrap() = minimize_to_tray;
    *state.close_behavior.lock().unwrap() = close_behavior;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // 🟢 [修改] 只有非移动端才注册不支持安卓的插件
    #[cfg(not(mobile))]
    {
        builder = builder
            .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
            .plugin(tauri_plugin_clipboard::init());
    }

    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .manage(SshState::default())
        .manage(MonitorCache::new())
        .manage(VaultState(Mutex::new(None)))
        .manage(WindowConfigState {
            minimize_to_tray: Mutex::new(true),
            close_behavior: Mutex::new("quit".to_string()), 
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let pool = tauri::async_runtime::block_on(async move {
                db::init_db(&handle).await.expect("数据库初始化失败")
            });
            app.manage(AppState { db: pool });

            // 🟢 [修改] 托盘逻辑已经被 cfg(desktop) 包裹，在移动端会自动跳过
            #[cfg(desktop)]
            {
                let handle = app.handle();
                let quit_i = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
                let show_i = MenuItem::with_id(handle, "show", "Show Main Window", true, None::<&str>)?;
                let menu = Menu::with_items(handle, &[&show_i, &quit_i])?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone()) 
                    .menu(&menu)
                    .on_menu_event(|app: &AppHandle, event: MenuEvent| {
                        match event.id().as_ref() {
                            "quit" => { app.exit(0); }
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
                        if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<WindowConfigState>();
                let behavior = state.close_behavior.lock().unwrap().clone();
                if behavior == "minimize" {
                    api.prevent_close();
                    let _ = window.hide(); 
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // ... (此处保持你原来的命令注册列表不变)
            list_servers, save_server, delete_server, update_last_connected,
            connect_ssh, write_ssh, resize_ssh, disconnect_ssh, test_connection,
            check_host_key, trust_host_key, quick_connect,
            get_ssh_cpu_info, get_ssh_mem_info, get_ssh_disk_info, get_ssh_os_info, get_ssh_network_info,
            list_ssh_files, sftp_mkdir, sftp_create_file, sftp_rename, sftp_delete, sftp_copy,
            sftp_download_file, sftp_upload_file, sftp_chmod, sftp_read_file, sftp_write_file,
            init_vault, unlock_vault, lock_vault, add_key, delete_key, 
            get_decrypted_content, get_all_keys, get_vault_status, check_key_associations,
            get_all_snippets, add_snippet, update_snippet, delete_snippet,
            add_proxy, get_all_proxies, update_proxy, delete_proxy,
            get_system_fonts, save_webdav_password, check_webdav, create_cloud_backup,
            get_backup_list, delete_cloud_backup, restore_cloud_backup,
            export_local_backup, import_local_backup,
            record_command_history, search_history_autocomplete, get_server_top_commands,
            get_command_history, delete_command_history, update_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
