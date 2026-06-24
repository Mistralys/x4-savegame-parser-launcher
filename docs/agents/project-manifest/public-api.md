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
- `async fn check_tool_config_exists(install_path: String) -> Result<bool, String>`
- `async fn query_save_data(php_path: String, script_path: String, command: String, save: String, filter: Option<String>, limit: Option<u32>, offset: Option<u32>, cache_key: Option<String>) -> Result<serde_json::Value, String>`
- `async fn query_save_data_with_progress(app: AppHandle, php_path: String, script_path: String, command: String, save: String, filter: Option<String>, limit: Option<u32>, offset: Option<u32>, cache_key: Option<String>) -> Result<serde_json::Value, String>`
- `async fn download_and_install_tools(app: AppHandle, config: Option<SetupConfig>) -> Result<InstalledPaths, String>`
- `async fn check_for_updates(current_version: Option<String>) -> Result<UpdateInfo, String>`

**Command Details**:

**`query_save_data`**: Synchronous query command that waits for completion and returns result. STDERR messages logged to console only.

**`query_save_data_with_progress`**: Streaming query command that emits progress events to frontend via `query-progress` event. Spawns PHP with `--json` flag, streams NDJSON events, returns final result. Use this for operations that may take time (e.g., logbook queries on legacy saves).

**`download_and_install_tools`**: Downloads PHP NTS x64 (Windows only) and the latest savegame monitor release from GitHub, extracts them under `<app_data_dir>/tools/`, and returns filesystem paths. Returns a descriptive error on non-Windows platforms. The optional `config` parameter (serialised as `{ phpDownloadUrl?, monitorAssetName? }`) overrides the compiled-in defaults; when omitted or when fields are `null`/`undefined`, defaults are used.

**`check_for_updates`**: Fetches the latest release tag from the monitor's GitHub repository and compares it against `current_version` (both stripped of a leading `v` prefix) using string equality. Returns `update_available: true` when the tags differ.

**Events Emitted by `query_save_data_with_progress`**:
- `query-progress`
  - Payload: `{ tool: String, message: serde_json::Value }`
  - Message structure: `{ type: "progress", name: String, status: "started"|"progress"|"complete", payload?: Object, timestamp: String }`

**Events Emitted by `download_and_install_tools`**:
- `setup-progress`
  - Payload: `SetupProgress { step: String, message: String, percent: u8 }`
  - Named stages (emitted in order): `detecting` (5%), `fetching_release` (10–20%), `downloading_monitor` (25–45%), `downloading_php` (50–65%), `extracting` (70–85%), `complete` (100%)

#### Models
```rust
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
```

### `src-tauri/src/setup.rs`

#### Public Structs
```rust
/// Progress event emitted to the frontend during installation stages.
#[derive(Clone, serde::Serialize)]
pub struct SetupProgress {
    pub step: String,
    pub message: String,
    pub percent: u8,
}

/// Paths returned to the frontend after a successful installation.
#[derive(serde::Serialize)]
pub struct InstalledPaths {
    pub php_path: String,
    pub install_path: String,
}

/// Version comparison result returned by `check_for_updates`.
#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub current_version: Option<String>,
    pub latest_version: String,
    pub update_available: bool,
}

/// Optional configuration overrides for `download_and_install_tools`.
/// All fields are optional; when absent the compiled-in defaults are used.
/// Serialised with camelCase field names for Tauri IPC.
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SetupConfig {
    /// Override the PHP NTS x64 Windows download URL.
    pub php_download_url: Option<String>,
    /// Override the monitor release asset filename (e.g. `x4-savegame-parser.zip`).
    pub monitor_asset_name: Option<String>,
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
- `interface AppConfig { phpPath, gameFolderPath, savegameFolderPath, installPath, viewerHost, viewerPort, language, autoBackupEnabled, keepXMLFiles, loggingEnabled }`
- `useConfig(): { config: AppConfig, updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>, loadFromToolConfig: () => Promise<void>, saveToToolConfig: () => Promise<void>, checkToolConfigExists: () => Promise<boolean>, isLoading: boolean, hasToolConfigError: boolean, toolConfigErrorMessage: string | null, toolConfigExists: boolean }`

#### `ProcessContext.tsx`
- `type ToolStatus = 'running' | 'stopped' | 'starting' | 'stopping'`
- `useProcess(): { tools: Record<string, ToolState>, startTool: (tool: string) => Promise<void>, stopTool: (tool: string) => Promise<void>, clearLogs: (tool: string) => void, clearEvents: (tool: string) => void }`

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

#### `NotificationContext.tsx`
- `useNotification(): { notify: (message, type: 'success' | 'info' | 'warning' | 'error') => void, notifications: Notification[] }`

### Hooks

#### `useSaveData.ts`
- `useSaveData(command, saveName, options): { data, totalItems, isLoading, error, setFilter, setPage, setLimit }`

### Components

- `App`: Main application entry.
- `ToolView`: Component for managing individual tools (Parser/Viewer).
- `SettingsView`: UI for configuration management.
- `SaveDataViewer`: Master-Detail view for exploring extracted save data.
- `ShipLossesView`: Analysis screen for universe-wide ship attrition.
- `OwnedShipsView`: Management screen for player-owned fleet assets.
- `DataTable`: Reusable, styled data table component.
- `DataPagination`: Standardized pagination controls with page-jump.
- `LogViewer`: Displays real-time process output.
- `ThemeToggle`: Switcher for light/dark/system themes.
- `ErrorBanner`: Global error display.
- `BlockingModal`: For critical states (e.g. initial validation).
- `LogbookView`: Historical game event log viewer with category filter dropdown and text search.
- `SetupWizard`: Modal overlay for automated PHP and Savegame Monitor installation. Emitted events: `setup-progress`. Props: `SetupWizardProps`.
- `WindowControls`: Custom title bar buttons for Tauri.

### Shared Types (`src/types/shared.ts`)
Centralised module for TypeScript interfaces shared across component and hook boundaries. Some are direct Tauri IPC payload shapes; others are React state shapes derived from Tauri events.

```typescript
/** Real-time progress payload emitted by the `setup-progress` Tauri event. */
export interface SetupProgress {
  step: string;    // Named stage identifier (e.g. 'fetching_release', 'extracting')
  message: string; // Human-readable progress message
  percent: number; // Completion percentage 0–100
}

/** Installation paths returned to the frontend on successful tool installation. */
export interface InstalledPaths {
  php_path: string;     // Absolute path to the php.exe binary
  install_path: string; // Absolute path to the tools installation directory
}

/** Version comparison result returned by the `check_for_updates` Tauri command. */
export interface UpdateInfo {
  current_version: string | null;
  latest_version: string;
  update_available: boolean;
}

/**
 * React state shape maintained by the `useQueryProgress` hook.
 * Derived from `query-progress` Tauri events; not a direct IPC payload.
 */
export interface QueryProgress {
  inProgress: boolean;
  operation: string | null;
  message: string | null;
  startTime: number | null;
}
```

> `SetupProgress`, `InstalledPaths`, and `UpdateInfo` are re-exported from `SetupWizard.tsx` for backward compatibility. `QueryProgress` is re-exported from `useQueryProgress.ts`.

### Exported Props (`SetupWizard.tsx`)
```typescript
/** Props accepted by the SetupWizard component. */
export interface SetupWizardProps {
  onComplete: (paths: InstalledPaths) => void; // Called with resolved paths on success
  onClose: () => void;                          // Called on cancel or after dismiss
}
```
