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
1. **Protocol:** The monitor is invoked with the `--json` flag, emitting NDJSON to `stdout`.
2. **Parsing:** `ProcessContext` monitors the stream and attempts to parse lines starting with `{`.
3. **State Updates:**
   - `tick`: Updates `lastTick` for heartbeat visualization.
   - `event`: Updates `currentEvent` (e.g., `SAVE_UNZIPPING`) and `detectedSave`.
   - `log`: Formats logs using provided `level` and `message`.
   - `error`: Formats as `[ERROR]` and adds to log history.
4. **UI Response:** `ToolView` reacts to these state changes by displaying progress labels and savegame information.

## Configuration Persistence
1. **Loading:** `ConfigProvider` uses `tauri-plugin-store` to load `settings.json` on mount.
2. **Updating:** `updateConfig` updates the React state and immediately saves to the persistent store.
3. **Tool Sync:** Changes to tool-relevant settings automatically trigger `save_tool_config` to update the tool's `config.json`.
4. **Manual Import:** Users can manually trigger `load_tool_config` via the UI to import settings from an existing `config.json`.
5. **Auto-Detection:** On first run (or if set to 'auto'), system language is detected and applied.

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
