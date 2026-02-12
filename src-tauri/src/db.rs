use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::fs;
use tauri::AppHandle;
use tauri::Manager; // 用于访问 path

// 初始化数据库连接池
pub async fn init_db(app: &AppHandle) -> Result<Pool<Sqlite>, String> {
    let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    
    // 统一使用一个数据库文件，例如 database.sqlite
    let db_path = app_dir.join("ishelldb.sqlite");
    
    // sqlx 需要文件存在才能连接
    if !db_path.exists() {
        fs::File::create(&db_path).map_err(|e| e.to_string())?;
    }

    let db_url = format!("sqlite://{}", db_path.to_str().unwrap());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| e.to_string())?;

        // 🟢 [新增] 开启 WAL 模式，大幅提升并发写入性能，防止 UI 卡死
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    // --- 执行建表迁移 ---
    
    // 1. Vault 表 (Config & Keys)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS vault_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS vault_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key_type TEXT NOT NULL,
            username TEXT,
            encrypted_content TEXT NOT NULL,
            salt TEXT NOT NULL,
            algorithm TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 2. Server 表
    // 注意：tags 我们存为 TEXT (JSON 字符串)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS servers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            provider TEXT,
            sort INTEGER,
            ip TEXT NOT NULL,
            port INTEGER,
            tags TEXT, 
            connection_type TEXT,
            proxy_id TEXT,
            auth_type TEXT,
            username TEXT,
            password TEXT,
            private_key TEXT,
            passphrase TEXT,
            password_id TEXT,
            password_source TEXT,
            key_id TEXT,
            key_source TEXT,
            private_key_remark TEXT,
            os TEXT,
            is_pinned BOOLEAN,
            enable_expiration BOOLEAN,
            expire_date TEXT,
            created_at INTEGER NOT NULL,      
            updated_at INTEGER NOT NULL,      
            last_connected_at INTEGER,
            connect_timeout INTEGER DEFAULT 10,
            keep_alive_interval INTEGER DEFAULT 60,
            auto_reconnect BOOLEAN DEFAULT 0,
            max_reconnects INTEGER DEFAULT 3        
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // --- [新增] 3. Snippets 表 ---
sqlx::query(
        "CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            code TEXT NOT NULL,
            language TEXT NOT NULL,
            tags TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // --- [New] 4. Proxies Table ---
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS proxies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            proxy_type TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT,
            password TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;
// 🟢 [新增] 5. Key Usages Table (密钥使用记录)
    // 采用联合主键 (key_id, server_id)，保证同一个密钥在同一个服务器只有一条最新记录
    // 使用 ON DELETE CASCADE 确保删除密钥或服务器时自动清理记录
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS key_usages (
            key_id TEXT NOT NULL,
            server_id TEXT NOT NULL,
            last_used_at INTEGER NOT NULL,
            PRIMARY KEY (key_id, server_id),
            FOREIGN KEY(key_id) REFERENCES vault_keys(id) ON DELETE CASCADE,
            FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 🟢 [新增] 6. Command History Tables (终端命令历史三层架构)

    // 6.1 全局字典表
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS command_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            normalized_command TEXT NOT NULL UNIQUE,
            display_command TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_used_at INTEGER NOT NULL,
            global_exec_count INTEGER DEFAULT 1
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 索引：补全搜索 & 热度排序
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_history_command ON command_history(normalized_command);")
        .execute(&pool).await.map_err(|e| e.to_string())?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_history_count ON command_history(global_exec_count DESC);")
        .execute(&pool).await.map_err(|e| e.to_string())?;

    // 6.2 服务器统计表
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS command_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command_id INTEGER NOT NULL,
            server_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_used_at INTEGER NOT NULL,
            exec_count INTEGER DEFAULT 1,
            FOREIGN KEY(command_id) REFERENCES command_history(id) ON DELETE CASCADE,
            UNIQUE(command_id, server_id)
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 索引：查询某服务器的高频命令
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_usage_server_rank ON command_usage(server_id, exec_count DESC);")
        .execute(&pool).await.map_err(|e| e.to_string())?;

    // 6.3 历史流水表
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS command_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command_id INTEGER NOT NULL,
            server_id TEXT NOT NULL,
            source TEXT DEFAULT 'user',
            executed_at INTEGER NOT NULL,
            FOREIGN KEY(command_id) REFERENCES command_history(id) ON DELETE CASCADE
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 索引：查询流水线
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_events_timeline ON command_events(server_id, executed_at DESC);")
        .execute(&pool).await.map_err(|e| e.to_string())?;

    // 7.1 规则集合 (Profile)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS highlight_rule_sets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_default BOOLEAN DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 7.2 样式定义 (Style)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS highlight_styles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            foreground TEXT,
            background TEXT,
            is_bold BOOLEAN DEFAULT 0,
            is_italic BOOLEAN DEFAULT 0,
            is_underline BOOLEAN DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 7.3 规则本体 (Rule)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS highlight_rules (
            id TEXT PRIMARY KEY,
            set_id TEXT NOT NULL,
            style_id TEXT NOT NULL,
            pattern TEXT NOT NULL,
            is_regex BOOLEAN DEFAULT 0,
            is_case_sensitive BOOLEAN DEFAULT 0,
            priority INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(set_id) REFERENCES highlight_rule_sets(id) ON DELETE CASCADE,
            FOREIGN KEY(style_id) REFERENCES highlight_styles(id)
        );"
    ).execute(&pool).await.map_err(|e| e.to_string())?;

    // 索引优化
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_highlight_rules_set_id ON highlight_rules(set_id);")
        .execute(&pool).await.map_err(|e| e.to_string())?;
    

    Ok(pool)
}