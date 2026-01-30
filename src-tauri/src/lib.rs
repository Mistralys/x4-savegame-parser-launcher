mod process;

use std::fs::{File, OpenOptions};
use std::path::PathBuf;
use std::io::Write;
use tauri::{AppHandle, Manager, State};
use crate::process::ProcessManager;

#[derive(serde::Serialize)]
struct SystemInfo {
    os: String,
    arch: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ToolConfig {
    game_folder: String,
    saves_folder: String,
    viewer_host: String,
    viewer_port: u16,
    auto_backup_enabled: bool,
    keep_xml_files: bool,
    logging_enabled: bool,
}

#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    })
}

#[tauri::command]
fn log_to_file(app: AppHandle, level: String, message: String) -> Result<(), String> {
    let log_path = app.path().app_log_dir().map_err(|e| e.to_string())?
        .join("debug.log");
    
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
    writeln!(file, "[{}] [{}] {}", timestamp, level.to_uppercase(), message)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn clear_log_file(app: AppHandle) -> Result<(), String> {
    let log_path = app.path().app_log_dir().map_err(|e| e.to_string())?
        .join("debug.log");
    
    if log_path.exists() {
        File::create(log_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn start_tool(
    app: AppHandle,
    manager: State<'_, ProcessManager>,
    tool: String,
    php_path: String,
    script_path: String,
) -> Result<(), String> {
    manager.start_tool(app, tool, php_path, script_path)
}

#[tauri::command]
async fn stop_tool(manager: State<'_, ProcessManager>, tool: String) -> Result<(), String> {
    manager.stop_tool(&tool)
}

#[tauri::command]
async fn is_tool_running(manager: State<'_, ProcessManager>, tool: String) -> Result<bool, String> {
    Ok(manager.is_running(&tool))
}

#[tauri::command]
async fn open_log_dir(app: AppHandle) -> Result<(), String> {
    let log_path = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&log_path).map_err(|e| e.to_string())?;
    
    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(log_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
async fn save_tool_config(config: ToolConfig, install_path: String) -> Result<(), String> {
    let install_path = install_path.trim();
    let path = std::path::Path::new(install_path).join("config.json");
    
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err(format!("Installation directory does not exist: {}", install_path));
        }
    }

    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| format!("Failed to write config.json: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn load_tool_config(install_path: String) -> Result<ToolConfig, String> {
    let path = std::path::Path::new(&install_path).join("config.json");
    if !path.exists() {
        return Err("Config file not found".to_string());
    }
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: ToolConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
async fn check_tool_config_exists(install_path: String) -> Result<bool, String> {
    let path = std::path::Path::new(&install_path).join("config.json");
    Ok(path.exists())
}

#[tauri::command]
async fn query_save_data(
    php_path: String,
    script_path: String,
    command: String,
    save: String,
    filter: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    cache_key: Option<String>,
) -> Result<serde_json::Value, String> {
    let mut cmd = tokio::process::Command::new(php_path);
    cmd.arg(script_path);
    cmd.arg(command);
    cmd.arg("--save");
    cmd.arg(save);

    if let Some(f) = filter {
        if !f.is_empty() {
            cmd.arg("--filter");
            cmd.arg(f);
        }
    }

    if let Some(l) = limit {
        cmd.arg("--limit");
        cmd.arg(l.to_string());
    }

    if let Some(o) = offset {
        cmd.arg("--offset");
        cmd.arg(o.to_string());
    }

    if let Some(ck) = cache_key {
        if !ck.is_empty() {
            cmd.arg("--cache-key");
            cmd.arg(ck);
        }
    }

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().await.map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    if stdout.trim().is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Command returned empty output. Stderr: {}", stderr));
    }

    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse JSON: {}. Output was: {}", e, stdout))?;
    
    Ok(json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ProcessManager::new())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            log_to_file,
            clear_log_file,
            start_tool,
            stop_tool,
            is_tool_running,
            open_log_dir,
            save_tool_config,
            load_tool_config,
            check_tool_config_exists,
            query_save_data
        ])
        .setup(|app| {
            let log_path = app.path().app_log_dir()?
                .join("debug.log");
            if let Some(parent) = log_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            File::create(log_path)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let manager = window.state::<ProcessManager>();
                manager.stop_all();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
