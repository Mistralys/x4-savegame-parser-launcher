# Key Data Flows

## IPC: Frontend to Backend (Invoke)
1. **Trigger:** A React component calls `invoke("command_name", { args })`.
2. **Backend Processing:** Tauri routes the call to the corresponding function in `lib.rs` marked with `#[tauri::command]`.
3. **Response:** The Rust function returns a value (wrapped in `Result<T, E>` for error handling).
4. **UI Update:** The frontend receives the response and updates context or local state.

## Tool Process Management & Log Streaming
1. **Start Command:** `ProcessContext` calls `start_tool` via IPC.
2. **Process Spawn:** `ProcessManager` (Rust) spawns a PHP child process with piped stdout/stderr.
3. **Log Interception:** `ProcessManager` spawns tokio tasks to read process output.
4. **Event Emission:** Output is emitted to the frontend via Tauri's `emit("process-output", ...)` event.
5. **Log Collection:** `ProcessContext` listens for `process-output` and updates its `logs` state for the relevant tool.
6. **Display:** `LogViewer` renders the logs from the context.

## NDJSON Structured Communication
1. **Protocol:** The monitor is automatically invoked with the `--json` flag by the Rust backend, emitting NDJSON to `stdout`.
2. **Parsing:** `ProcessContext` monitors the stream and attempts to parse lines starting with `{`.
3. **State Updates:**
   - `tick`: Updates `lastTick` for heartbeat visualization. Ticks are not added to the log history.
   - `event`: Updates `currentEvent` (e.g., `SAVE_UNZIPPING`), `version`, and `detectedSave`. Events are added to both logs and a dedicated `events` history.
   - `log`: Formats logs using the provided `level` and `message`.
   - `error`: Populates the `error` state with a full exception chain (message, code, class, trace) and adds the fatal error to the log history.
4. **UI Response:** `ToolView` reacts to these state changes by displaying progress labels, savegame information, and error diagnostics.

## Long-Running Query Flow with Progress
1. **Trigger:** LogbookView calls `useSaveData.query('log')` which invokes `query_save_data_with_progress`.
2. **Process Spawn:** Tauri spawns PHP process with `--json` flag: `php query.php --json log --save=X`.
3. **Event Streaming:** PHP emits NDJSON progress events to stdout:
   - `{"type":"progress","name":"LOG_CACHE_BUILDING","status":"started",...}`
   - `{"type":"progress","name":"LOG_CACHE_BUILDING","status":"complete",...}`
   - `{"type":"result","data":{...}}`
4. **Rust Processing:** `query_save_data_with_progress` reads stdout line-by-line:
   - For `type: "progress"`: Emits Tauri event `query-progress` with full message
   - For `type: "result"`: Captures final data and returns it
5. **Frontend Listening:** `useQueryProgress` hook listens to `query-progress` events:
   - `status: "started"` → Sets `inProgress: true, operation: "LOG_CACHE_BUILDING"`
   - `status: "complete"` → Sets `inProgress: false`
6. **UI Updates:** LogbookView displays blue progress banner when `inProgress && operation === 'LOG_CACHE_BUILDING'`
7. **Completion:** When PHP process exits, final result is returned to `useSaveData.query()` and data is displayed
8. **Parallel Flows:**
   - Progress updates are non-blocking (frontend receives events in real-time)
   - Data fetching blocks until PHP completes (returns final result)
   - Banner automatically hides via `useQueryProgress` state management

## LogbookView: Category Dropdown Population
1. **Trigger:** `LogbookView` mounts or `saveId` changes → `fetchCategories` callback is invoked.
2. **Metadata Query:** `fetchCategories` calls `useSaveData` to invoke `query_save_data_with_progress` with command `log-metadata` against the current save.
3. **Success Path (dynamic):**
   - The PHP backend returns an array of `{ id, label, count }` objects.
   - Categories are stored in component state.
   - The dropdown renders each entry as `"<translated label> (<count>)"` — the translation key `t('logbook.categories.<id>')` is used when registered; otherwise the backend `label` field is the display text.
4. **Fallback Path (empty or error):**
   - If the response is an empty array or the query throws, `categories` is set to `[]`.
   - The dropdown falls back to `Object.keys(CATEGORY_ICONS)` so all known category types remain selectable (no counts shown).
   - If a `saveId` is present, a non-blocking info notification is fired: "Category counts unavailable — re-extract the save to enable them."
5. **Icon/Color Assignment:** `CATEGORY_ICONS` and `CATEGORY_COLORS` maps are not modified by this flow; icon and color lookup is always keyed by category `id` independent of the dropdown source.

## Configuration Persistence
1. **Loading:** `ConfigProvider` uses `tauri-plugin-store` to load `settings.json` on mount.
2. **Migration:** On load, the legacy `viewerUrl` is automatically migrated to `viewerHost` and `viewerPort`.
3. **Updating:** `updateConfig` updates the React state and immediately saves to the persistent store.
4. **Tool Sync:** Users can manually trigger `save_tool_config` via the UI to sync settings to the tool's internal `config.json`.
5. **Manual Import:** Users can manually trigger `load_tool_config` via the UI to import settings from an existing `config.json`.
6. **Auto-Detection:** On first run (or if set to 'auto'), system language is detected and applied.

## Environment Validation
1. **Trigger:** Validation runs on mount and every 5 seconds (periodic check).
2. **Checks:** `ValidationContext` uses `tauri-plugin-fs` to check if PHP, tool scripts, and folder paths exist.
3. **Blocker:** If essential paths are invalid, a `BlockingModal` prevents tool usage until settings are corrected.

## Theme Synchronization
1. **Initial Load:** `ThemeContext` reads the theme from `localStorage`.
2. **DOM Manipulation:** An `useEffect` hook adds/removes `.dark` or `.light` classes on `document.documentElement`.
3. **System Listening:** A `matchMedia` listener reacts to OS-level theme changes when mode is set to `system`.

## Application Lifecycle
1. **Backend Init:** `main.rs` -> `lib::run()` -> Plugin setup (Store, FS, etc.) -> ProcessManager setup.
2. **Frontend Init:** `main.tsx` -> Multiple Providers -> `App`.
3. **Tool Cleanup:** When the window is destroyed, `on_window_event` in Rust triggers `stop_all()` to kill any orphan PHP processes.

## Installation Wizard Flow
1. **Trigger:** User clicks **Auto-Setup Tools** in `SettingsView` "Environment & Tools" section. The button is only rendered when `config.installPath` is empty or `config.phpPath` is unset/default (`'php'`).
2. **Modal Open:** `SettingsView` sets `showSetupWizard: true`, rendering `SetupWizard` as an absolute overlay inside the `relative` settings container.
3. **Listener Registration:** On mount, `SetupWizard` calls `listen('setup-progress', ...)` to subscribe to Tauri events before invoking the command.
4. **Installation Invoked:** `SetupWizard` calls `invoke('download_and_install_tools')`. Rust downloads PHP NTS x64 and the latest monitor release from GitHub, extracts them under `<app_data_dir>/tools/`, and emits `setup-progress` events at each stage:
   - `{ step: 'detecting', message: '...', percent: 5 }`
   - `{ step: 'fetching_release', message: '...', percent: 10-20 }`
   - `{ step: 'downloading_monitor', message: '...', percent: 25-45 }`
   - `{ step: 'downloading_php', message: '...', percent: 50-65 }`
   - `{ step: 'extracting', message: '...', percent: 70-85 }`
   - `{ step: 'complete', message: 'Setup complete!', percent: 100 }`
5. **Progress Display:** `SetupWizard` updates `progress` state on each event, rendering a progress bar and step message in real-time.
6. **Success:** `invoke` resolves with `InstalledPaths { php_path, install_path }`. `SetupWizard` calls `onComplete(paths)` → `SettingsView.handleWizardComplete` calls `updateConfig({ phpPath, installPath })` and closes the modal.
7. **Error:** If `invoke` rejects, `SetupWizard` stores the error string and renders it with a **Retry** button (re-invokes `download_and_install_tools`) and a **Cancel** button (closes modal).
8. **Updates Check:** A **Check for Updates** button in `SetupWizard` calls `invoke('check_for_updates', { current_version: null })` and displays inline `UpdateInfo`.
