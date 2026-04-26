use font_kit::source::SystemSource;

#[tauri::command]
pub fn get_system_fonts() -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    match source.all_families() {
        Ok(families) => {
            // 去重并排序
            let mut font_names: Vec<String> = families.into_iter().collect();
            font_names.sort();
            font_names.dedup(); // 移除重复项
            Ok(font_names)
        }
        Err(e) => Err(format!("Failed to load fonts: {:?}", e)),
    }
}
