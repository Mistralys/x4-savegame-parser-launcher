# Public API (Signatures Only)

## Backend (Rust)

### `src-tauri/src/lib.rs`

#### Commands
- `async fn get_system_info() -> Result<SystemInfo, String>`
- `fn log_to_file(app: AppHandle, level: String, message: String) -> Result<(), String>`
- `fn clear_log_file(app: AppHandle) -> Result<(), String>`
- `async fn start_tool(app: AppHandle, manager: State<ProcessManager>, tool: String, php_path: String, script_path: String) -> Result<(), String>`
- `async fn stop_tool(manager: State<ProcessManager>, tool: String) -> Result<(), String>`
- `async fn is_tool_running(manager: State<ProcessManager>, tool: String) -> Result<bool, String>`
- `async fn open_log_dir(app: AppHandle) -> Result<(), String>`
- `async fn save_tool_config(config: ToolConfig, install_path: String) -> Result<(), String>`
- `async fn load_tool_config(install_path: String) -> Result<ToolConfig, String>`

#### Models
```rust
#[derive(serde::Serialize)]
struct SystemInfo {
    os: String,
    arch: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ToolConfig {
    game_folder: String,
    storage_folder: String,
    viewer_host: String,
    viewer_port: u16,
    auto_backup_enabled: bool,
    keep_xml_files: bool,
    logging_enabled: bool,
}
```

### `src-tauri/src/process.rs`

#### Events (Emitted to Frontend)
- `process-output`
  - Payload: `{ tool: String, message: String, stream: String }`

---

## Frontend (TypeScript/React)

### Context Providers

#### `ConfigContext.tsx`
- `interface AppConfig { phpPath, gameFolderPath, savegameFolderPath, installPath, viewerHost, viewerPort, language, storageFolder, autoBackupEnabled, keepXMLFiles, loggingEnabled }`
- `useConfig(): { config: AppConfig, updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>, loadFromToolConfig: () => Promise<void>, isLoading: boolean, hasToolConfigError: boolean }`

#### `ProcessContext.tsx`
- `type ToolStatus = 'running' | 'stopped' | 'starting' | 'stopping'`
- `useProcess(): { tools: Record<string, ToolState>, startTool: (tool: string) => Promise<void>, stopTool: (tool: string) => Promise<void>, clearLogs: (tool: string) => void }`

#### `I18nContext.tsx`
- `type Language = 'en' | 'fr' | 'de'`
- `useI18n(): { language: Language, setLanguage: (lang: Language) => void, t: (path: string) => string, availableLanguages: { code: Language, name: string }[] }`

#### `ValidationContext.tsx`
- `useValidation(): { validation: ValidationResult, isValidating: boolean, validateNow: () => Promise<void> }`

#### `ThemeContext.tsx`
- `type Theme = 'light' | 'dark' | 'system'`
- `useTheme(): { theme: Theme, setTheme: (theme: Theme) => void }`

#### `ErrorContext.tsx`
- `useError(): { showError: (title, message, details?) => void, clearError: () => void, currentError: ErrorDialog | null }`

### Components

- `App`: Main application entry.
- `ToolView`: Component for managing individual tools (Parser/Viewer).
- `SettingsView`: UI for configuration management.
- `LogViewer`: Displays real-time process output.
- `ThemeToggle`: Switcher for light/dark/system themes.
- `ErrorBanner`: Global error display.
- `BlockingModal`: For critical states (e.g. initial validation).
- `WindowControls`: Custom title bar buttons for Tauri.
