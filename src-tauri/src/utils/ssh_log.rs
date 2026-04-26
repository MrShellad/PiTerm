use chrono::Local;
use regex::Regex;
use serde::Serialize;
use serde_json::{Map, Value};
use ssh2::Session;
use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::net::{Ipv4Addr, Ipv6Addr};
use std::path::{Component, Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Instant;
use tauri::{AppHandle, Manager};

const SSH_DIAGNOSTIC_LOG_DIR: &str = "logs";
const SSH_DIAGNOSTIC_LOG_PREFIX: &str = "ssh-diagnostics";
const REDACTED_VALUE: &str = "[REDACTED]";

static SSH_DIAGNOSTIC_LOGGER: OnceLock<SshDiagnosticLogger> = OnceLock::new();

pub struct SshDiagnosticLogger {
    file: Mutex<File>,
    path: PathBuf,
}

#[derive(Clone, Copy)]
pub enum SshLogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl SshLogLevel {
    fn as_str(self) -> &'static str {
        match self {
            Self::Debug => "DEBUG",
            Self::Info => "INFO",
            Self::Warn => "WARN",
            Self::Error => "ERROR",
        }
    }

    fn should_write_to_file(self) -> bool {
        matches!(self, Self::Warn | Self::Error)
    }
}

pub struct SshLogRecord {
    component: &'static str,
    event: &'static str,
    message: String,
    session_id: Option<String>,
    server_id: Option<String>,
    instance_id: Option<u64>,
    fields: BTreeMap<String, Value>,
}

impl SshLogRecord {
    pub fn new(component: &'static str, event: &'static str, message: impl Into<String>) -> Self {
        Self {
            component,
            event,
            message: message.into(),
            session_id: None,
            server_id: None,
            instance_id: None,
            fields: BTreeMap::new(),
        }
    }

    pub fn session_id(mut self, session_id: impl Into<String>) -> Self {
        self.session_id = Some(session_id.into());
        self
    }

    pub fn server_id(mut self, server_id: impl Into<String>) -> Self {
        self.server_id = Some(server_id.into());
        self
    }

    pub fn instance_id(mut self, instance_id: u64) -> Self {
        self.instance_id = Some(instance_id);
        self
    }

    pub fn field<T: Serialize>(mut self, key: impl Into<String>, value: T) -> Self {
        self.fields.insert(
            key.into(),
            serde_json::to_value(value)
                .unwrap_or_else(|_| Value::String("[UNSERIALIZABLE]".into())),
        );
        self
    }

    pub fn extend_fields<I>(mut self, fields: I) -> Self
    where
        I: IntoIterator<Item = (String, Value)>,
    {
        self.fields.extend(fields);
        self
    }
}

pub fn log_field<T: Serialize>(key: impl Into<String>, value: T) -> (String, Value) {
    (
        key.into(),
        serde_json::to_value(value).unwrap_or_else(|_| Value::String("[UNSERIALIZABLE]".into())),
    )
}

pub fn init_ssh_diagnostic_logger(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(logger) = SSH_DIAGNOSTIC_LOGGER.get() {
        return Ok(logger.path.clone());
    }

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let log_dir = app_dir.join(SSH_DIAGNOSTIC_LOG_DIR);
    fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;

    let file_name = format!(
        "{}-{}.log",
        SSH_DIAGNOSTIC_LOG_PREFIX,
        Local::now().format("%Y-%m-%d")
    );
    let path = log_dir.join(file_name);
    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;

    let logger = SshDiagnosticLogger {
        file: Mutex::new(file),
        path: path.clone(),
    };

    let _ = SSH_DIAGNOSTIC_LOGGER.set(logger);

    info(
        SshLogRecord::new(
            "ssh.diagnostics",
            "logger_initialized",
            "SSH diagnostic logging initialized",
        )
        .field("log_file", mask_path(path.to_string_lossy().as_ref())),
    );

    Ok(path)
}

pub fn ssh_diagnostic_log_path() -> Option<PathBuf> {
    SSH_DIAGNOSTIC_LOGGER
        .get()
        .map(|logger| logger.path.clone())
}

pub fn debug(record: SshLogRecord) {
    log(SshLogLevel::Debug, record);
}

pub fn info(record: SshLogRecord) {
    log(SshLogLevel::Info, record);
}

pub fn warn(record: SshLogRecord) {
    log(SshLogLevel::Warn, record);
}

pub fn error(record: SshLogRecord) {
    log(SshLogLevel::Error, record);
}

pub fn run_timed_session_operation<T, F>(
    session_arc: Arc<Mutex<Session>>,
    component: &'static str,
    operation: &'static str,
    session_id: &str,
    extra_fields: Vec<(String, Value)>,
    action: F,
) -> Result<T, String>
where
    F: FnOnce(&Session) -> Result<T, String>,
{
    debug(
        SshLogRecord::new(component, operation, "Background SSH operation requested")
            .session_id(session_id.to_string())
            .extend_fields(extra_fields.clone()),
    );

    let lock_started = Instant::now();
    let session = session_arc.lock().map_err(|e| {
        let err = format!("SSH session lock failed: {}", e);
        error(
            SshLogRecord::new(
                component,
                operation,
                "Failed to lock background SSH session",
            )
            .session_id(session_id.to_string())
            .field("error", err.clone())
            .extend_fields(extra_fields.clone()),
        );
        err
    })?;
    let lock_wait_ms = lock_started.elapsed().as_millis() as u64;

    let started = Instant::now();
    let result = action(&session);
    let duration_ms = started.elapsed().as_millis() as u64;

    let base_record = SshLogRecord::new(
        component,
        operation,
        if result.is_ok() {
            "Background SSH operation completed"
        } else {
            "Background SSH operation failed"
        },
    )
    .session_id(session_id.to_string())
    .field("lock_wait_ms", lock_wait_ms)
    .field("duration_ms", duration_ms)
    .extend_fields(extra_fields);

    match &result {
        Ok(_) => info(base_record),
        Err(err) => warn(base_record.field("error", err.clone())),
    }

    result
}

pub fn mask_identifier(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return "[EMPTY]".to_string();
    }

    let chars: Vec<char> = trimmed.chars().collect();
    if chars.len() <= 6 {
        return format!("{}***", chars.iter().take(2).collect::<String>());
    }

    let head: String = chars.iter().take(4).collect();
    let tail: String = chars
        .iter()
        .rev()
        .take(3)
        .copied()
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("{}***{}", head, tail)
}

pub fn mask_host(host: &str) -> String {
    let host = host.trim();
    if host.is_empty() {
        return "[EMPTY_HOST]".to_string();
    }

    if let Ok(ip) = host.parse::<Ipv4Addr>() {
        let octets = ip.octets();
        return format!("{}.{}.x.x", octets[0], octets[1]);
    }

    if let Ok(ip) = host.parse::<Ipv6Addr>() {
        let segments = ip.segments();
        return format!("{:x}:{:x}:****:****", segments[0], segments[1]);
    }

    let labels: Vec<&str> = host.split('.').filter(|label| !label.is_empty()).collect();
    if labels.is_empty() {
        return "[INVALID_HOST]".to_string();
    }

    if labels.len() == 1 {
        return format!("{}***", labels[0].chars().take(2).collect::<String>());
    }

    let masked_labels: Vec<String> = labels
        .iter()
        .enumerate()
        .map(|(index, label)| {
            if index == labels.len() - 1 {
                (*label).to_string()
            } else {
                format!("{}***", label.chars().take(1).collect::<String>())
            }
        })
        .collect();

    masked_labels.join(".")
}

pub fn mask_username(username: &str) -> String {
    let username = username.trim();
    if username.is_empty() {
        return "[EMPTY_USER]".to_string();
    }

    let chars: Vec<char> = username.chars().collect();
    if chars.len() <= 2 {
        return format!("{}***", chars[0]);
    }

    format!("{}***{}", chars[0], chars[chars.len() - 1])
}

pub fn mask_path(path: &str) -> String {
    let path = path.trim();
    if path.is_empty() {
        return "[EMPTY_PATH]".to_string();
    }

    let parsed = Path::new(path);
    let depth = parsed
        .components()
        .filter(|component| matches!(component, Component::Normal(_)))
        .count();

    let file_name = parsed
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default();

    if file_name.is_empty() {
        return format!("[path depth:{}]", depth);
    }

    let masked_name = {
        let chars: Vec<char> = file_name.chars().collect();
        if chars.len() <= 3 {
            format!("{}***", chars.iter().take(1).collect::<String>())
        } else {
            let head: String = chars.iter().take(2).collect();
            let tail = file_name
                .rsplit_once('.')
                .map(|(_, ext)| format!(".{}", ext))
                .unwrap_or_default();
            format!("{}***{}", head, tail)
        }
    };

    format!("[path depth:{}]/{}", depth, masked_name)
}

pub fn sanitize_text(input: &str) -> String {
    let mut sanitized = input.trim().replace('\r', "");
    sanitized = pem_block_regex()
        .replace_all(&sanitized, REDACTED_VALUE)
        .into_owned();
    sanitized = secret_assignment_regex()
        .replace_all(&sanitized, |caps: &regex::Captures| {
            format!("{}={}", &caps[1], REDACTED_VALUE)
        })
        .into_owned();
    sanitized = secret_json_regex()
        .replace_all(&sanitized, |caps: &regex::Captures| {
            format!("\"{}\":\"{}\"", &caps[1], REDACTED_VALUE)
        })
        .into_owned();
    sanitized = bearer_token_regex()
        .replace_all(&sanitized, format!("Bearer {}", REDACTED_VALUE))
        .into_owned();
    sanitized = ipv4_regex()
        .replace_all(&sanitized, |caps: &regex::Captures| mask_host(&caps[0]))
        .into_owned();
    sanitized = ipv6_regex()
        .replace_all(&sanitized, |caps: &regex::Captures| mask_host(&caps[0]))
        .into_owned();

    const MAX_LOG_TEXT_LEN: usize = 320;
    if sanitized.chars().count() > MAX_LOG_TEXT_LEN {
        let truncated: String = sanitized.chars().take(MAX_LOG_TEXT_LEN).collect();
        return format!("{}...(truncated)", truncated);
    }

    sanitized
}

fn log(level: SshLogLevel, record: SshLogRecord) {
    let Some(logger) = SSH_DIAGNOSTIC_LOGGER.get() else {
        return;
    };

    let payload = build_payload(level, record);
    let line = format_log_line(&payload);

    if level.should_write_to_file() {
        if let Ok(mut file) = logger.file.lock() {
            let _ = writeln!(file, "{}", line);
            let _ = file.flush();
        }
    }

    if matches!(level, SshLogLevel::Warn | SshLogLevel::Error) {
        eprintln!("{}", line);
    }
}

fn build_payload(level: SshLogLevel, record: SshLogRecord) -> Map<String, Value> {
    let mut payload = Map::new();
    payload.insert(
        "ts".to_string(),
        Value::String(Local::now().format("%Y-%m-%d %H:%M:%S%.3f %:z").to_string()),
    );
    payload.insert(
        "level".to_string(),
        Value::String(level.as_str().to_string()),
    );
    payload.insert(
        "component".to_string(),
        Value::String(record.component.to_string()),
    );
    payload.insert("event".to_string(), Value::String(record.event.to_string()));
    payload.insert(
        "message".to_string(),
        Value::String(sanitize_text(&record.message)),
    );

    if let Some(session_id) = record.session_id {
        payload.insert(
            "sessionId".to_string(),
            Value::String(mask_identifier(&session_id)),
        );
    }

    if let Some(server_id) = record.server_id {
        payload.insert(
            "serverId".to_string(),
            Value::String(mask_identifier(&server_id)),
        );
    }

    if let Some(instance_id) = record.instance_id {
        payload.insert("instanceId".to_string(), Value::Number(instance_id.into()));
    }

    if !record.fields.is_empty() {
        let fields = record
            .fields
            .into_iter()
            .map(|(key, value)| (key.clone(), sanitize_field_value(&key, value)))
            .collect();
        payload.insert("fields".to_string(), Value::Object(fields));
    }

    payload
}

fn format_log_line(payload: &Map<String, Value>) -> String {
    let ts = payload
        .get("ts")
        .and_then(Value::as_str)
        .unwrap_or("0000-00-00 00:00:00.000 +00:00");
    let level = payload
        .get("level")
        .and_then(Value::as_str)
        .unwrap_or("INFO");
    let component = payload
        .get("component")
        .and_then(Value::as_str)
        .unwrap_or("ssh.unknown");
    let event = payload
        .get("event")
        .and_then(Value::as_str)
        .unwrap_or("unknown_event");
    let message = payload
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("missing log message");

    let mut metadata = Vec::new();

    if let Some(session_id) = payload.get("sessionId").and_then(Value::as_str) {
        metadata.push(format!("session={}", session_id));
    }

    if let Some(server_id) = payload.get("serverId").and_then(Value::as_str) {
        metadata.push(format!("server={}", server_id));
    }

    if let Some(instance_id) = payload.get("instanceId").and_then(Value::as_u64) {
        metadata.push(format!("instance={}", instance_id));
    }

    if let Some(fields) = payload.get("fields").and_then(Value::as_object) {
        for (key, value) in fields {
            metadata.push(format!("{}={}", key, format_value(value)));
        }
    }

    if metadata.is_empty() {
        format!("[{}] [{}] {}.{} {}", ts, level, component, event, message)
    } else {
        format!(
            "[{}] [{}] {}.{} {} | {}",
            ts,
            level,
            component,
            event,
            message,
            metadata.join(" ")
        )
    }
}

fn format_value(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(boolean) => boolean.to_string(),
        Value::Number(number) => number.to_string(),
        Value::String(text) => text.clone(),
        Value::Array(items) => {
            let parts: Vec<String> = items.iter().map(format_value).collect();
            format!("[{}]", parts.join(", "))
        }
        Value::Object(map) => {
            let parts: Vec<String> = map
                .iter()
                .map(|(key, value)| format!("{}={}", key, format_value(value)))
                .collect();
            format!("{{{}}}", parts.join(", "))
        }
    }
}

fn sanitize_field_value(key: &str, value: Value) -> Value {
    let lower_key = key.to_ascii_lowercase();

    if is_sensitive_key(&lower_key) {
        return Value::String(REDACTED_VALUE.to_string());
    }

    match value {
        Value::String(text) => {
            let sanitized = if lower_key.contains("host") || lower_key == "ip" {
                mask_host(&text)
            } else if lower_key.contains("user") {
                mask_username(&text)
            } else if lower_key.contains("path") || lower_key.contains("file") {
                mask_path(&text)
            } else if lower_key.ends_with("id") {
                mask_identifier(&text)
            } else {
                sanitize_text(&text)
            };

            Value::String(sanitized)
        }
        Value::Array(items) => Value::Array(
            items
                .into_iter()
                .map(|item| sanitize_field_value(key, item))
                .collect(),
        ),
        Value::Object(map) => Value::Object(
            map.into_iter()
                .map(|(child_key, child_value)| {
                    let child_sanitized = sanitize_field_value(&child_key, child_value);
                    (child_key, child_sanitized)
                })
                .collect(),
        ),
        other => other,
    }
}

fn is_sensitive_key(key: &str) -> bool {
    [
        "password",
        "passphrase",
        "secret",
        "token",
        "private_key",
        "authorization",
        "credential",
        "content",
        "command_payload",
    ]
    .iter()
    .any(|needle| key.contains(needle))
}

fn pem_block_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r"(?s)-----BEGIN [^-]+-----.*?-----END [^-]+-----").unwrap())
}

fn secret_assignment_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(
            r#"(?i)\b(password|passphrase|secret|token|private_key|authorization)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)"#,
        )
        .unwrap()
    })
}

fn secret_json_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| {
        Regex::new(
            r#"(?i)"(password|passphrase|secret|token|private_key|authorization)"\s*:\s*"[^"]*""#,
        )
        .unwrap()
    })
}

fn bearer_token_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r#"(?i)Bearer\s+[A-Za-z0-9\-._~+/]+=*"#).unwrap())
}

fn ipv4_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r#"\b(?:\d{1,3}\.){3}\d{1,3}\b"#).unwrap())
}

fn ipv6_regex() -> &'static Regex {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    REGEX.get_or_init(|| Regex::new(r#"\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b"#).unwrap())
}
