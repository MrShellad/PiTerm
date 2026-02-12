use base64::{Engine as _, engine::general_purpose};

pub fn encrypt_data(data: &str) -> String {
    let salted = format!("_SALT_{}_END_", data);
    general_purpose::STANDARD.encode(salted)
}

pub fn decrypt_data(data: &str) -> Result<String, String> {
    let decoded_bytes = general_purpose::STANDARD.decode(data).map_err(|_| "Decode failed".to_string())?;
    let decoded_str = String::from_utf8(decoded_bytes).map_err(|_| "Invalid UTF-8".to_string())?;
    
    let prefix = "_SALT_";
    let suffix = "_END_";
    if decoded_str.starts_with(prefix) && decoded_str.ends_with(suffix) {
        Ok(decoded_str[prefix.len()..decoded_str.len() - suffix.len()].to_string())
    } else {
        Err("Data corruption".to_string())
    }
}