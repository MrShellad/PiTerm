pub mod commands;
pub mod models;
pub mod db;
pub mod state;
pub mod services;
pub mod utils;
// 🟢 [修改 1] 更新引用列表，确保包含所有需要的类型
use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::{TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use std::sync::Mutex;
use crate::state::AppState;
use commands::monitor::MonitorCache;
use commands::ssh::SshState;
use commands::vault::VaultState;
use tauri_plugin_autostart::MacosLauncher;

// ================================
// 引入 Server 相关命令
// ================================
use commands::fs::*;
use commands::server::*;
use commands::backup::{
    check_webdav, create_cloud_backup, get_backup_list, delete_cloud_backup, prepare_cloud_restore, apply_restore_file, export_local_backup, import_local_backup, save_webdav_password};
// ================================
// 引入 SSH 命令
// ================================
use commands::ssh::*;
use commands::history::*;
// ================================
// 引入 Vault (密钥管理) 命令
// ================================
use commands::vault::{
    add_key, delete_key, get_all_keys, get_decrypted_content, init_vault, lock_vault, unlock_vault, get_vault_status,check_key_associations
};

// [新增] 引入 snippet 命令模块
use commands::snippet::*;

use commands::monitor::*;

use commands::proxy::{add_proxy, get_all_proxies, update_proxy, delete_proxy};

// [新增] 引入 System 模块 (字体相关)
use commands::system::*;

// ==============================================================================
// 🟢 [修改 2] 定义窗口配置状态
// ==============================================================================
pub struct WindowConfigState {
    pub minimize_to_tray: Mutex<bool>,
    pub close_behavior: Mutex<String>, // "quit" 或 "minimize"
}

// ==============================================================================
// 🟢 [修改 3] 实现更新配置的命令
// ==============================================================================
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
    tauri::Builder::default()
        // 插件注册
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        // 状态管理
        .manage(SshState::default())
        .manage(MonitorCache::new())
        .manage(VaultState(Mutex::new(None)))
        
        // 初始化窗口配置状态
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

             // ============================================================
             // 🟢 [新增] 系统托盘配置 (带类型注解)
             // ============================================================
             #[cfg(desktop)]
             {
                 let handle = app.handle();
                 
                 // 1. 创建托盘菜单项
                 let quit_i = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
                 let show_i = MenuItem::with_id(handle, "show", "Show Main Window", true, None::<&str>)?;
                 let menu = Menu::with_items(handle, &[&show_i, &quit_i])?;

                 // 2. 创建托盘图标
                 let _tray = TrayIconBuilder::new()
                     .icon(app.default_window_icon().unwrap().clone()) 
                     .menu(&menu)
                     // 🟢 添加了类型注解: |app: &AppHandle, event: MenuEvent|
                     .on_menu_event(|app: &AppHandle, event: MenuEvent| {
                         match event.id().as_ref() {
                             "quit" => {
                                 app.exit(0); 
                             }
                             "show" => {
                                 if let Some(window) = app.get_webview_window("main") {
                                     let _ = window.show();
                                     let _ = window.set_focus();
                                 }
                             }
                             _ => {}
                         }
                     })
                     // 🟢 添加了类型注解: |tray: &TrayIcon, event: TrayIconEvent|
                     .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
                         if let TrayIconEvent::Click {
                             button: tauri::tray::MouseButton::Left,
                             ..
                         } = event
                         {
                             let app = tray.app_handle();
                             if let Some(window) = app.get_webview_window("main") {
                                 let _ = window.show();
                                 let _ = window.set_focus();
                             }
                         }
                     })
                     .build(app)?;
             }
             // ============================================================

             Ok(())
        })

        // 监听窗口关闭事件
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // 1. 获取当前状态
                let state = window.state::<WindowConfigState>();
                let behavior = state.close_behavior.lock().unwrap().clone();
                
                // 2. 如果设置为 "minimize"，则阻止关闭并隐藏窗口
                if behavior == "minimize" {
                    api.prevent_close(); // 阻止默认退出行为
                    window.hide().unwrap(); // 隐藏窗口 (配合托盘使用)
                }
            }
        })

        // 注册命令
        .invoke_handler(tauri::generate_handler![
            // Server
            list_servers,
            save_server,
            delete_server,
            update_last_connected,
            // SSH
            connect_ssh,
            write_ssh,
            resize_ssh,
            disconnect_ssh,
            test_connection,
            check_host_key,
            trust_host_key,
            quick_connect,
            // 监控命令
            get_ssh_cpu_info,
            get_ssh_mem_info,
            get_ssh_disk_info,
            get_ssh_os_info,
            get_ssh_network_info,
            get_ssh_process_list,
            // 文件管理
            list_ssh_files,
            sftp_mkdir,
            sftp_create_file,
            sftp_rename,
            sftp_delete,
            sftp_copy,
            sftp_download_file,
            sftp_upload_file,
            sftp_chmod,
            sftp_read_file,
            sftp_write_file,
            sftp_check_is_dir,
            sftp_get_home_dir,
            // 密钥管理 (Vault)
            init_vault,
            unlock_vault,
            lock_vault,
            add_key,
            delete_key, 
            get_decrypted_content,
            get_all_keys,
            get_vault_status,
            check_key_associations,
            
            // Snippet 命令
            get_all_snippets,
            add_snippet,
            update_snippet,
            delete_snippet,

            // Proxy Commands
            add_proxy,
            get_all_proxies,
            update_proxy,
            delete_proxy,

            // 系统/字体命令
            get_system_fonts,

            save_webdav_password,
            check_webdav,
            create_cloud_backup,
            get_backup_list,
            delete_cloud_backup,
            prepare_cloud_restore, apply_restore_file,
            export_local_backup,
            import_local_backup,
            // 历史记录相关命令
            record_command_history,
            search_history_autocomplete,
            get_server_top_commands,
            get_command_history,
            delete_command_history,

            // 注册更新配置命令
            update_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}