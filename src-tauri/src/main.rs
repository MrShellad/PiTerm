// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 调用 lib.rs 中的 run 函数
    // 注意：这里的 "ishell_lib" 必须与 Cargo.toml 中 [lib] 的 name 一致
    itermx_lib::run();
}
