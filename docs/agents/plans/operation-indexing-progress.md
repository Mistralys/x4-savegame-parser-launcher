# Plan: Logbook Cache Progress via NDJSON Events

This implements progress reporting for logbook cache generation (and any future long-running operations) using structured NDJSON events. The solution extends the existing monitor pattern to CLI mode, creating reusable infrastructure for both projects.

**Architecture**: PHP emits progress events to STDOUT when in JSON mode → Tauri streams events via new command → React displays real-time status via notifications/loading states.

**Key Decisions**:
- Use NDJSON events (consistent with monitor mode)
- General pattern for all CLI progress (not logbook-specific)
- Add `--json` flag to query CLI for event mode
- Events cleanly separated from final JSON response

---

## Work Package Overview

| WP | Name | Dependencies | Testable Standalone | Priority |
|----|------|--------------|---------------------|----------|
| WP1 | PHP: Progress Event Infrastructure | None | ✅ Yes | HIGH |
| WP2 | PHP: Logbook Cache Progress Events | WP1 | ✅ Yes | HIGH |
| WP3 | PHP: CLI JSON Mode Support | WP1, WP2 | ✅ Yes | HIGH |
| WP4 | PHP: Documentation Updates | WP1-3 | N/A | MEDIUM |
| WP5 | Tauri: Streaming Query Command | WP3 (for full test) | ⚠️ Partial | HIGH |
| WP6 | Tauri: Fallback STDERR Enhancement | None | ✅ Yes | LOW |
| WP7 | Frontend: Progress Hook | WP5 | ⚠️ Mock only | MEDIUM |
| WP8 | Frontend: LogbookView Integration | WP5, WP7 | ✅ Yes | HIGH |
| WP9 | Frontend: I18n Strings | WP8 | ✅ Yes | MEDIUM |
| WP10 | Documentation: Manifest Updates | All | N/A | MEDIUM |

**Implementation Sequence**: WP1 → WP2 → WP3 → WP4 → WP5 → WP7 → WP8 → WP9 → WP10 (WP6 can be done anytime)

---

## Work Packages

### WP1: PHP Backend - Progress Event Infrastructure (Foundation)

**Objective**: Create reusable ProgressEmitter utility for any long-running operation

**Context**:
- Current: PHP backend uses `file_put_contents('php://stderr', ...)` for status messages
- Problem: STDERR messages not visible in UI, hard to parse programmatically
- Solution: Structured NDJSON progress events to STDOUT when in JSON mode
- Pattern: Reusable across any future long-running operations (not just logbook)

**Dependencies**: None

**Files to Create**:

📄 **[src/X4/SaveViewer/Utilities/ProgressEmitter.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\Utilities\ProgressEmitter.php)** (NEW FILE)

```php
<?php
declare(strict_types=1);

namespace X4\SaveViewer\Utilities;

use DateTime;
use DateTimeZone;

/**
 * Utility for emitting progress events during long-running operations.
 * 
 * When JSON_OUTPUT_MODE constant is defined and true, emits NDJSON events
 * to STDOUT for consumption by external tools (e.g., Tauri launcher).
 * 
 * Event Format:
 * {
 *   "type": "progress",
 *   "name": "OPERATION_NAME",
 *   "status": "started|progress|complete",
 *   "payload": {...},  // optional
 *   "timestamp": "2026-02-08T10:30:00+00:00"
 * }
 */
class ProgressEmitter
{
    /**
     * Check if JSON output mode is enabled
     */
    private static function isJsonMode(): bool
    {
        return defined('JSON_OUTPUT_MODE') && JSON_OUTPUT_MODE === true;
    }

    /**
     * Emit a progress event to STDOUT (JSON mode) or do nothing
     */
    private static function emit(string $name, string $status, array $payload = []): void
    {
        if (!self::isJsonMode()) {
            return;
        }

        $event = [
            'type' => 'progress',
            'name' => $name,
            'status' => $status,
            'timestamp' => (new DateTime('now', new DateTimeZone('UTC')))->format('c')
        ];

        if (!empty($payload)) {
            $event['payload'] = $payload;
        }

        echo json_encode($event, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
        flush();
    }

    /**
     * Emit operation started event
     */
    public static function emitStarted(string $operation, array $payload = []): void
    {
        self::emit($operation, 'started', $payload);
    }

    /**
     * Emit operation progress event
     */
    public static function emitProgress(string $operation, array $payload = []): void
    {
        self::emit($operation, 'progress', $payload);
    }

    /**
     * Emit operation complete event
     */
    public static function emitComplete(string $operation, array $payload = []): void
    {
        self::emit($operation, 'complete', $payload);
    }
}
```

**Testing**:
```bash
# Test without JSON mode (should be no-op)
php -r "require 'vendor/autoload.php'; X4\SaveViewer\Utilities\ProgressEmitter::emitStarted('TEST_OP');"
# Expected: No output

# Test with JSON mode
php -r "define('JSON_OUTPUT_MODE', true); require 'vendor/autoload.php'; X4\SaveViewer\Utilities\ProgressEmitter::emitStarted('TEST_OP', ['key' => 'value']);"
# Expected: {"type":"progress","name":"TEST_OP","status":"started","timestamp":"...","payload":{"key":"value"}}
```

**Success Criteria**:
- ✅ Class created in correct namespace
- ✅ Methods are static and publicly accessible
- ✅ Emits NDJSON only when `JSON_OUTPUT_MODE` is defined
- ✅ Includes timestamp in UTC ISO 8601 format
- ✅ Flushes output buffer after each event

---

### WP2: PHP Backend - Logbook Cache Progress Events

**Objective**: Update logbook cache generation to emit progress events using ProgressEmitter

**Context**:
- Current: `Log.php::toArrayForAPI()` writes directly to STDERR when generating cache
- Problem: STDERR messages logged to console but not exposed to UI
- Solution: Use ProgressEmitter for structured events, keep STDERR as fallback

**Dependencies**: WP1 (ProgressEmitter must exist)

**Files to Modify**:

📄 **[src/X4/SaveViewer/Data/SaveReader/Log.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\Data\SaveReader\Log.php)** (lines ~192-200)

**Current Code** (approximate location):
```php
public function toArrayForAPI(): array
{
    // Generate cache if missing (for legacy saves)
    if (!$this->isCacheValid()) {
        // Output to stderr for transparency while keeping JSON clean
        file_put_contents('php://stderr', "Generating log analysis cache...\n");
        $this->generateAnalysisCache();
        file_put_contents('php://stderr', "Log analysis cache generated.\n");
        // ... cache date refresh ...
    }
    // ... rest of method ...
}
```

**Change Required**:
1. Add `use X4\SaveViewer\Utilities\ProgressEmitter;` at top of file
2. Replace STDERR writes with ProgressEmitter calls:
   - Before generation: `ProgressEmitter::emitStarted('LOG_CACHE_BUILDING');`
   - After generation: `ProgressEmitter::emitComplete('LOG_CACHE_BUILDING');`
3. **Keep STDERR writes** for backward compatibility and non-JSON mode visibility

**New Code**:
```php
public function toArrayForAPI(): array
{
    // Generate cache if missing (for legacy saves)
    if (!$this->isCacheValid()) {
        // Emit structured progress event for external tools
        ProgressEmitter::emitStarted('LOG_CACHE_BUILDING');
        
        // Output to stderr for transparency while keeping JSON clean
        file_put_contents('php://stderr', "Generating log analysis cache...\n");
        
        $this->generateAnalysisCache();
        
        // Emit completion event
        ProgressEmitter::emitComplete('LOG_CACHE_BUILDING');
        
        file_put_contents('php://stderr', "Log analysis cache generated.\n");
        // ... cache date refresh ...
    }
    // ... rest of method ...
}
```

---

📄 **[src/X4/SaveViewer/SaveParser.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\SaveParser.php)** (line ~154)

**Current Code** (method `generateLogAnalysisCache()`):
```php
private function generateLogAnalysisCache() : void
{
    // Only generate for main savegame extractions with a save file
    if ($this->saveFile === null) {
        return;
    }

    try {
        // Create a temporary SaveManager and ArchivedSave to access SaveReader
        $manager = SaveManager::createFromConfig();
        $archivedSave = new ArchivedSave($manager, $this->analysis);
        $reader = new SaveReader($archivedSave);
        $log = $reader->getLog();

        // Only generate if not already present
        if (!$log->isCacheValid()) {
            $this->log('Generating log analysis cache...');
            $log->generateAnalysisCache();
            $this->log('Log analysis cache generated successfully.');
        }

        // Warm query cache for fast pagination
        $this->warmLogQueryCache($archivedSave, $reader);
    } catch (\Exception $e) {
        $this->log('Warning: Failed to generate log analysis cache: ' . $e->getMessage());
    }
}
```

**Change Required**:
1. Add `use X4\SaveViewer\Utilities\ProgressEmitter;` at top of file
2. Add ProgressEmitter calls around cache generation:
   - Before generation: `ProgressEmitter::emitStarted('LOG_CACHE_BUILDING');`
   - After generation: `ProgressEmitter::emitComplete('LOG_CACHE_BUILDING');`
3. **Keep existing `$this->log()` calls** for extraction context

**New Code**:
```php
private function generateLogAnalysisCache() : void
{
    // Only generate for main savegame extractions with a save file
    if ($this->saveFile === null) {
        return;
    }

    try {
        // Create a temporary SaveManager and ArchivedSave to access SaveReader
        $manager = SaveManager::createFromConfig();
        $archivedSave = new ArchivedSave($manager, $this->analysis);
        $reader = new SaveReader($archivedSave);
        $log = $reader->getLog();

        // Only generate if not already present
        if (!$log->isCacheValid()) {
            ProgressEmitter::emitStarted('LOG_CACHE_BUILDING');
            $this->log('Generating log analysis cache...');
            $log->generateAnalysisCache();
            $this->log('Log analysis cache generated successfully.');
            ProgressEmitter::emitComplete('LOG_CACHE_BUILDING');
        }

        // Warm query cache for fast pagination
        $this->warmLogQueryCache($archivedSave, $reader);
    } catch (\Exception $e) {
        $this->log('Warning: Failed to generate log analysis cache: ' . $e->getMessage());
    }
}
```

**Testing**:
```bash
# Test CLI query without JSON mode (should see STDERR but no NDJSON)
bin\query.bat log --save=test-save --limit=5

# Test with JSON mode (will be available after WP3)
bin\query.bat --json log --save=test-save --limit=5
# Expected: NDJSON progress events + final result
```

**Success Criteria**:
- ✅ ProgressEmitter imported in both files
- ✅ `emitStarted()` called before cache generation
- ✅ `emitComplete()` called after cache generation
- ✅ Existing STDERR/log messages remain intact
- ✅ No errors when running extraction or query CLI

---

### WP3: PHP Backend - CLI JSON Mode Support

**Objective**: Add `--json` flag to query CLI to enable NDJSON event streaming

**Context**:
- Current: Query CLI outputs JSON to STDOUT, progress messages to STDERR
- Problem: Cannot stream progress events to Tauri frontend during query
- Solution: Add `--json` flag that enables event mode, wraps final result

**Dependencies**: WP1 (ProgressEmitter), WP2 (events in place)

**Files to Modify**:

📄 **[bin/php/query.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\bin\php\query.php)**

**Current Structure** (approximate):
```php
<?php
define('X4_SAVEGAME_VIEWER_ROOT', dirname(__DIR__, 2));
require_once X4_SAVEGAME_VIEWER_ROOT . '/prepend.php';

use League\CLImate\CLImate;
use X4\SaveViewer\QueryHandler;

$climate = new CLImate();
// ... argument definitions ...
$climate->parse();

// ... query execution ...
$result = $handler->execute($command, $saveId, $options);

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
```

**Changes Required**:

1. **Add `--json` flag definition**:
```php
$climate->arguments->add([
    'json' => [
        'prefix' => 'j',
        'longPrefix' => 'json',
        'description' => 'Enable JSON event streaming mode (NDJSON progress + result wrapper)',
        'noValue' => true,
    ],
    // ... existing arguments ...
]);
```

2. **Enable JSON_OUTPUT_MODE before autoload**:
```php
// Check for --json flag early (before classes load)
$jsonMode = in_array('--json', $argv) || in_array('-j', $argv);

if ($jsonMode) {
    define('JSON_OUTPUT_MODE', true);
}

define('X4_SAVEGAME_VIEWER_ROOT', dirname(__DIR__, 2));
require_once X4_SAVEGAME_VIEWER_ROOT . '/prepend.php';
```

3. **Wrap final result if JSON mode**:
```php
$result = $handler->execute($command, $saveId, $options);

if ($jsonMode) {
    // In JSON mode, wrap result for distinction from progress events
    $output = [
        'type' => 'result',
        'data' => $result
    ];
    echo json_encode($output, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
} else {
    // Standard mode: pretty-printed JSON
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
```

**Complete Modified File Structure**:
```php
<?php
// Check for --json flag early (before classes load)
$jsonMode = in_array('--json', $argv) || in_array('-j', $argv);

if ($jsonMode) {
    define('JSON_OUTPUT_MODE', true);
}

define('X4_SAVEGAME_VIEWER_ROOT', dirname(__DIR__, 2));
require_once X4_SAVEGAME_VIEWER_ROOT . '/prepend.php';

use League\CLImate\CLImate;
use X4\SaveViewer\QueryHandler;

$climate = new CLImate();

$climate->arguments->add([
    'json' => [
        'prefix' => 'j',
        'longPrefix' => 'json',
        'description' => 'Enable JSON event streaming mode (NDJSON progress + result wrapper)',
        'noValue' => true,
    ],
    'command' => [
        'required' => true,
        'description' => 'Query command (e.g., log, ships, factions)',
    ],
    // ... other existing arguments ...
]);

$climate->parse();

// ... existing query execution logic ...

$result = $handler->execute($command, $saveId, $options);

// Output result
if ($climate->arguments->get('json')) {
    // JSON event mode: wrap result to distinguish from progress events
    $output = [
        'type' => 'result',
        'data' => $result
    ];
    echo json_encode($output, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    flush();
} else {
    // Standard mode: pretty-printed JSON
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
```

**Testing**:
```bash
# Standard mode (should work as before)
bin\query.bat log --save=test-save --limit=5
# Expected: Pretty-printed JSON

# JSON event mode (new)
bin\query.bat --json log --save=test-save-no-cache --limit=5
# Expected output:
# {"type":"progress","name":"LOG_CACHE_BUILDING","status":"started","timestamp":"..."}
# {"type":"progress","name":"LOG_CACHE_BUILDING","status":"complete","timestamp":"..."}
# {"type":"result","data":{"success":true,"data":[...],"pagination":{...}}}
```

**Success Criteria**:
- ✅ `--json` flag added to CLI arguments
- ✅ `JSON_OUTPUT_MODE` constant defined when flag present
- ✅ Progress events appear before final result
- ✅ Final result wrapped in `{type: "result", data: ...}`
- ✅ Standard mode (without `--json`) unchanged
- ✅ All output lines are valid JSON (NDJSON format)

---

### WP4: PHP Backend - Documentation Updates

**Objective**: Document new progress events and CLI JSON mode in project manifest

**Context**:
- Manifest is source of truth for architecture
- New events must be documented for Tauri integration
- CLI changes must be documented for future reference

**Dependencies**: WP1-3 (implementation complete)

**Files to Modify**:

📄 **[docs/agents/project-manifest/ndjson-interface.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\ndjson-interface.md)**

**Add New Section** (after existing Monitor Events section):

```markdown
## Progress Events (CLI JSON Mode)

When the query CLI is invoked with the `--json` flag, it enables event streaming mode. In this mode, progress events are emitted to STDOUT as NDJSON, followed by the final result.

### Event Structure

Progress events use a distinct structure from monitor events:

```json
{
  "type": "progress",
  "name": "OPERATION_NAME",
  "status": "started|progress|complete",
  "payload": { /* optional operation-specific data */ },
  "timestamp": "2026-02-08T10:30:00+00:00"
}
```

### Result Wrapper

The final query result is wrapped to distinguish it from progress events:

```json
{
  "type": "result",
  "data": { /* original API response */ }
}
```

### Available Progress Events

| Event Name | Status Values | Payload | Description |
|------------|---------------|---------|-------------|
| `LOG_CACHE_BUILDING` | `started`, `complete` | None | Logbook analysis cache generation |

### Example Flow

```bash
bin/query.bat --json log --save=test-save --limit=10
```

**Output**:
```json
{"type":"progress","name":"LOG_CACHE_BUILDING","status":"started","timestamp":"2026-02-08T10:30:00Z"}
{"type":"progress","name":"LOG_CACHE_BUILDING","status":"complete","timestamp":"2026-02-08T10:30:15Z"}
{"type":"result","data":{"success":true,"data":[...],"pagination":{"total":1234,"limit":10,"offset":0}}}
```

### Usage Notes

- Each line is a complete JSON object (NDJSON format)
- Progress events may appear in any order during execution
- Final result always has `type: "result"`
- Without `--json` flag, behaves as standard CLI (no events, pretty JSON)
- STDERR still contains human-readable messages for debugging
```

---

📄 **[docs/agents/project-manifest/cli-api-reference.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\cli-api-reference.md)**

**Update Query Command Section** (find existing query documentation):

**Add to Options Table**:
```markdown
| Option | Alias | Type | Description |
|--------|-------|------|-------------|
| `--json` | `-j` | Flag | Enable JSON event streaming mode (NDJSON progress + result wrapper) |
```

**Add Subsection** (after existing query examples):

```markdown
### JSON Event Streaming Mode

When `--json` flag is used, the CLI emits NDJSON progress events followed by the final result.

**Standard Mode** (default):
```bash
bin/query.bat log --save=mysave --limit=5
```
Output: Pretty-printed JSON to STDOUT

**Event Streaming Mode**:
```bash
bin/query.bat --json log --save=mysave --limit=5
```
Output: NDJSON events + result wrapper to STDOUT

**Use Case**: External tools (Tauri launcher) can parse events for real-time progress updates.

See [NDJSON Interface](ndjson-interface.md#progress-events-cli-json-mode) for event details.
```

---

📄 **Regenerate Merged Manifest**:

Run:
```bash
bin\merge-manifest.bat
```

This updates `docs/X4-Savegame-Parser-Manifest.md` with the new content.

**Success Criteria**:
- ✅ Progress events documented with structure and examples
- ✅ `LOG_CACHE_BUILDING` event in catalog
- ✅ CLI `--json` flag documented
- ✅ Example flows showing NDJSON output
- ✅ Merged manifest regenerated
- ✅ Cross-references between documents

---

### WP5: Tauri Backend - Streaming Query Command

**Objective**: Create new Tauri command that streams PHP progress events to frontend

**Context**:
- Current: `query_save_data` uses `.output().await` which blocks until complete
- Problem: Cannot show progress during long-running queries
- Solution: New command spawns PHP process, streams STDOUT, emits Tauri events

**Dependencies**: WP3 (PHP --json mode must exist)

**Files to Modify**:

📄 **[src-tauri/src/lib.rs](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src-tauri\src\lib.rs)** (after line ~208)

**Add New Command**:

```rust
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use std::process::Stdio;

#[derive(Clone, serde::Serialize)]
struct QueryProgressEvent {
    tool: String,
    message: serde_json::Value,
}

#[tauri::command]
async fn query_save_data_with_progress(
    app: AppHandle,
    php_path: String,
    script_path: String,
    command: String,
    save: String,
    filter: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    cache_key: Option<String>,
) -> Result<serde_json::Value, String> {
    // Build command with --json flag for event streaming
    let mut cmd = TokioCommand::new(&php_path);
    cmd.arg(&script_path)
        .arg("--json")
        .arg(&command)
        .arg("--save")
        .arg(&save);

    if let Some(f) = filter {
        cmd.arg("--filter").arg(f);
    }
    if let Some(l) = limit {
        cmd.arg("--limit").arg(l.to_string());
    }
    if let Some(o) = offset {
        cmd.arg("--offset").arg(o.to_string());
    }
    if let Some(ck) = cache_key {
        cmd.arg("--cache-key").arg(ck);
    }

    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        eprintln!("Failed to spawn PHP query process: {}", e);
        format!("Failed to start query: {}", e)
    })?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Stream STDERR for debugging
    let stderr_handle = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if !line.is_empty() {
                eprintln!("CLI STDERR: {}", line);
            }
        }
    });

    // Stream STDOUT, emit events, capture final result
    let app_clone = app.clone();
    let stdout_handle = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        let mut final_result: Option<serde_json::Value> = None;

        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }

            // Try to parse as JSON
            match serde_json::from_str::<serde_json::Value>(&line) {
                Ok(json) => {
                    // Check message type
                    if let Some(msg_type) = json.get("type").and_then(|t| t.as_str()) {
                        match msg_type {
                            "progress" => {
                                // Emit progress event to frontend
                                let _ = app_clone.emit(
                                    "query-progress",
                                    QueryProgressEvent {
                                        tool: "query".to_string(),
                                        message: json,
                                    },
                                );
                            }
                            "result" => {
                                // Capture final result
                                if let Some(data) = json.get("data") {
                                    final_result = Some(data.clone());
                                }
                            }
                            _ => {
                                eprintln!("Unknown message type: {}", msg_type);
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to parse JSON line: {} - Error: {}", line, e);
                }
            }
        }

        final_result
    });

    // Wait for process to complete
    let status = child.wait().await.map_err(|e| {
        format!("Query process error: {}", e)
    })?;

    // Wait for stdout processing
    let final_result = stdout_handle.await.map_err(|e| {
        format!("Failed to process output: {}", e)
    })?;

    // Wait for stderr (don't care about result)
    let _ = stderr_handle.await;

    // Check process exit status
    if !status.success() {
        return Err(format!("Query failed with exit code: {:?}", status.code()));
    }

    // Return final result
    final_result.ok_or_else(|| "No result received from query".to_string())
}
```

**Register Command**:

Find the `invoke_handler!` macro in `lib.rs` and add the new command:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ... existing setup ...
        .invoke_handler(tauri::generate_handler![
            // ... existing commands ...
            query_save_data,
            query_save_data_with_progress, // ADD THIS
            // ... rest of commands ...
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Testing**:

1. **Backend Test**: Start Tauri dev mode and verify command is registered
```bash
cd x4-savegame-parser-launcher
npm run tauri dev
```

2. **Browser Console Test**:
```javascript
// Test streaming query command
const { invoke, listen } = window.__TAURI__;

// Listen for progress events
const unlisten = await listen('query-progress', (event) => {
  console.log('Progress:', event.payload);
});

// Invoke command
const result = await invoke('query_save_data_with_progress', {
  phpPath: 'C:\\Path\\To\\php.exe',
  scriptPath: 'C:\\Path\\To\\query.php',
  command: 'log',
  save: 'test-save',
  limit: 10
});

console.log('Result:', result);
unlisten();
```

**Success Criteria**:
- ✅ Command compiles without errors
- ✅ Command registered in `invoke_handler!`
- ✅ Spawns PHP process with `--json` flag
- ✅ Streams STDOUT line-by-line
- ✅ Emits `query-progress` events for progress messages
- ✅ Returns final result data
- ✅ Handles errors gracefully (non-zero exit, missing result)
- ✅ STDERR logged to console for debugging

---

### WP6: Tauri Backend - Fallback STDERR Enhancement

**Objective**: Improve existing `query_save_data` to emit STDERR messages as events

**Context**:
- Current: STDERR logged to console only with `eprintln!`
- Problem: Frontend cannot show STDERR messages to user
- Solution: Emit Tauri event when STDERR contains status messages

**Dependencies**: None (enhancement to existing command)

**Files to Modify**:

📄 **[src-tauri/src/lib.rs](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src-tauri\src\lib.rs)** (line ~194-196)

**Current Code**:
```rust
let stderr = String::from_utf8_lossy(&output.stderr);

if !stderr.is_empty() {
    eprintln!("CLI STDERR: {}", stderr);
}
```

**Change Required**:

Add event emission for cache building messages:

```rust
let stderr = String::from_utf8_lossy(&output.stderr);

if !stderr.is_empty() {
    eprintln!("CLI STDERR: {}", stderr);
    
    // Emit event if stderr contains cache building message
    if stderr.contains("Generating log analysis cache") {
        let _ = app.emit(
            "query-stderr",
            serde_json::json!({
                "message": "Building logbook cache...",
                "type": "cache_building"
            })
        );
    }
}
```

**Register Event Type** (add to top of file if not exists):

```rust
#[derive(Clone, serde::Serialize)]
struct QueryStderrEvent {
    message: String,
    r#type: String,
}
```

**Usage**:

This provides a backward-compatible way for frontend to detect cache building even without the new streaming command.

**Testing**:
```javascript
// Listen for stderr events
const unlisten = await listen('query-stderr', (event) => {
  console.log('STDERR:', event.payload);
});

// Run query with old command
const result = await invoke('query_save_data', { /* ... */ });
```

**Success Criteria**:
- ✅ STDERR still logged to console (unchanged behavior)
- ✅ `query-stderr` event emitted for cache building messages
- ✅ Event payload includes message and type
- ✅ No breaking changes to existing command signature

**Priority**: LOW (WP5 is the preferred solution; this is a quick fallback)

---

### WP7: Frontend - Progress Hook

**Objective**: Create React hook to manage query progress state from Tauri events

**Context**:
- Current: No frontend infrastructure for progress tracking
- Problem: Components need centralized way to track long-running operations
- Solution: Custom hook that listens to `query-progress` events and manages state

**Dependencies**: WP5 (Tauri streaming command and events)

**Files to Create**:

📄 **[src/hooks/useQueryProgress.ts](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\hooks\useQueryProgress.ts)** (NEW FILE)

```typescript
import { useEffect, useState, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface QueryProgress {
  inProgress: boolean;
  operation: string | null;
  message: string | null;
  startTime: number | null;
}

interface ProgressEvent {
  tool: string;
  message: {
    type: string;
    name: string;
    status: 'started' | 'progress' | 'complete';
    payload?: Record<string, unknown>;
    timestamp: string;
  };
}

const PROGRESS_TIMEOUT = 30000; // 30 seconds safety timeout

/**
 * Hook to track query progress from Tauri events
 * 
 * Listens to 'query-progress' events emitted by query_save_data_with_progress
 * command and maintains state about ongoing operations.
 * 
 * @returns Progress state including operation name and status
 */
export function useQueryProgress(): QueryProgress {
  const [progress, setProgress] = useState<QueryProgress>({
    inProgress: false,
    operation: null,
    message: null,
    startTime: null,
  });

  const clearProgress = useCallback(() => {
    setProgress({
      inProgress: false,
      operation: null,
      message: null,
      startTime: null,
    });
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Set up event listener
    const setupListener = async () => {
      unlisten = await listen<ProgressEvent>('query-progress', (event) => {
        const { message } = event.payload;

        if (message.type === 'progress') {
          switch (message.status) {
            case 'started':
              setProgress({
                inProgress: true,
                operation: message.name,
                message: `Starting ${message.name}...`,
                startTime: Date.now(),
              });

              // Set safety timeout
              if (timeoutId) clearTimeout(timeoutId);
              timeoutId = setTimeout(() => {
                console.warn(`Progress timeout for operation: ${message.name}`);
                clearProgress();
              }, PROGRESS_TIMEOUT);
              break;

            case 'progress':
              setProgress((prev) => ({
                ...prev,
                message: message.payload?.message as string || prev.message,
              }));
              break;

            case 'complete':
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              clearProgress();
              break;
          }
        }
      });
    };

    setupListener();

    // Cleanup
    return () => {
      if (unlisten) {
        unlisten();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [clearProgress]);

  return progress;
}
```

**Key Features**:
- Listens to `query-progress` Tauri events
- Manages state for `started`, `progress`, `complete` statuses
- Auto-clears after 30s timeout (safety mechanism)
- Provides operation name for filtering (e.g., "LOG_CACHE_BUILDING")
- TypeScript typed for all event payloads

**Testing**:

Create test file: `src/hooks/useQueryProgress.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useQueryProgress } from './useQueryProgress';
import { mockIPC } from '@tauri-apps/api/mocks';

describe('useQueryProgress', () => {
  it('should start progress on started event', async () => {
    const { result } = renderHook(() => useQueryProgress());

    expect(result.current.inProgress).toBe(false);

    // Simulate Tauri event
    act(() => {
      mockIPC((cmd) => {
        // Emit mock event
      });
    });

    // Write full test coverage once Tauri test mocks are set up
  });
});
```

**Success Criteria**:
- ✅ Hook created with TypeScript types
- ✅ Listens to `query-progress` events
- ✅ Updates state on `started` status
- ✅ Clears state on `complete` status
- ✅ Auto-clears after timeout
- ✅ Cleanup on unmount prevents memory leaks

---

### WP8: Frontend - LogbookView Integration

**Objective**: Update LogbookView to show progress banner and use streaming command

**Context**:
- Current: LogbookView shows generic spinner during all loading states
- Problem: User doesn't know if cache is building vs normal query delay
- Solution: Display informative banner when cache building is in progress

**Dependencies**: WP5 (streaming command), WP7 (progress hook)

**Files to Modify**:

📄 **[src/hooks/useSaveData.ts](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\hooks\useSaveData.ts)** (line ~48-68)

**Current Code** (method `query`):
```typescript
const query = useCallback(async <T>(
  saveId: string,
  command: string,
  options: QueryOptions = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await invoke<ApiResponse<T>>('query_save_data', {
      phpPath: config.phpPath,
      scriptPath: toolPaths.query,
      command,
      save: saveId,
      filter: options.filter,
      limit: options.limit,
      offset: options.offset,
      cacheKey: options.cacheKey,
    });
    return response;
  } catch (error) {
    // ... error handling ...
  }
}, [config.phpPath, toolPaths.query]);
```

**Change Required**:

Try new streaming command first, fall back to old command:

```typescript
const query = useCallback(async <T>(
  saveId: string,
  command: string,
  options: QueryOptions = {}
): Promise<ApiResponse<T>> => {
  try {
    // Try new streaming command first (with progress events)
    try {
      const response = await invoke<ApiResponse<T>>('query_save_data_with_progress', {
        phpPath: config.phpPath,
        scriptPath: toolPaths.query,
        command,
        save: saveId,
        filter: options.filter,
        limit: options.limit,
        offset: options.offset,
        cacheKey: options.cacheKey,
      });
      return response;
    } catch (streamError) {
      // Fall back to standard command if streaming not available
      console.warn('Streaming query failed, falling back to standard query:', streamError);
      
      const response = await invoke<ApiResponse<T>>('query_save_data', {
        phpPath: config.phpPath,
        scriptPath: toolPaths.query,
        command,
        save: saveId,
        filter: options.filter,
        limit: options.limit,
        offset: options.offset,
        cacheKey: options.cacheKey,
      });
      return response;
    }
  } catch (error) {
    // ... existing error handling ...
  }
}, [config.phpPath, toolPaths.query]);
```

---

📄 **[src/components/LogbookView.tsx](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\components\LogbookView.tsx)** (around line ~73)

**Add Imports**:
```typescript
import { useQueryProgress } from '../hooks/useQueryProgress';
import { Loader2 } from 'lucide-react';
```

**Add Hook Usage** (after existing hooks):
```typescript
const { inProgress: cachingInProgress, operation } = useQueryProgress();
```

**Add Banner Component** (before DataTable):
```typescript
// Cache building banner
{cachingInProgress && operation === 'LOG_CACHE_BUILDING' && (
  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
    <Loader2 className="animate-spin text-blue-500" size={20} />
    <div>
      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
        {t('logbook.cacheBuildingTitle')}
      </p>
      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
        {t('logbook.cacheBuildingMessage')}
      </p>
    </div>
  </div>
)}
```

**Full Integration Location**:

Find the existing DataTable render and add banner above it:

```typescript
return (
  <div className="flex flex-col h-full">
    {/* Existing filters and search */}
    
    {/* NEW: Cache building progress banner */}
    {cachingInProgress && operation === 'LOG_CACHE_BUILDING' && (
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
        <Loader2 className="animate-spin text-blue-500" size={20} />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {t('logbook.cacheBuildingTitle')}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {t('logbook.cacheBuildingMessage')}
          </p>
        </div>
      </div>
    )}

    {/* Existing DataTable */}
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      // ... rest of props
    />
  </div>
);
```

**Testing**:

1. **Dev Mode Test**:
```bash
npm run tauri dev
```

2. **Manual Test Steps**:
   - Navigate to Logbook view
   - Select a save without cache (or delete cache manually)
   - Verify blue banner appears with spinner
   - Verify banner disappears when data loads
   - Check that logbook data displays correctly

3. **Visual Verification**:
   - Banner matches app theme (light/dark)
   - Banner has proper spacing
   - Spinner animates smoothly
   - Text is readable in both themes

**Success Criteria**:
- ✅ `useQueryProgress` hook imported and used
- ✅ Banner displays when `LOG_CACHE_BUILDING` in progress
- ✅ Banner disappears when complete
- ✅ Banner styling matches app design system
- ✅ Works in both light and dark themes
- ✅ Fallback to old command works if streaming unavailable
- ✅ No console errors

---

### WP9: Frontend - I18n Strings

**Objective**: Add translations for logbook cache building messages

**Context**:
- App uses i18n for all UI strings
- Need English and German translations
- Strings used in LogbookView banner component

**Dependencies**: WP8 (LogbookView implementation)

**Files to Modify**:

📄 **[src/locales/en.json](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\locales\en.json)**

Find the `"logbook"` section and add new keys:

**Current Structure** (approximate):
```json
{
  "logbook": {
    "title": "Logbook",
    "search": "Search entries...",
    // ... existing keys ...
  }
}
```

**Add Keys**:
```json
{
  "logbook": {
    "title": "Logbook",
    "search": "Search entries...",
    "cacheBuildingTitle": "Indexing in Progress",
    "cacheBuildingMessage": "Building logbook index for first-time access... This may take a moment.",
    // ... existing keys ...
  }
}
```

---

📄 **[src/locales/de.json](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\locales\de.json)**

Add German translations:

```json
{
  "logbook": {
    "title": "Logbuch",
    "search": "Einträge durchsuchen...",
    "cacheBuildingTitle": "Indizierung läuft",
    "cacheBuildingMessage": "Logbuch-Index wird für den ersten Zugriff erstellt... Dies kann einen Moment dauern.",
    // ... existing keys ...
  }
}
```

**Testing**:

1. **Language Switch Test**:
```typescript
// In browser dev tools
const { useI18n } = window;
const { i18n } = useI18n();
i18n.changeLanguage('de'); // Switch to German
i18n.changeLanguage('en'); // Switch to English
```

2. **Visual Test**:
   - Start app in English, trigger cache building
   - Verify message displays in English
   - Switch to German in settings
   - Trigger cache building again
   - Verify message displays in German

3. **String Validation**:
   - Check that keys match exactly what's used in `LogbookView.tsx`
   - Verify no typos in translation keys
   - Ensure German translation is grammatically correct

**Success Criteria**:
- ✅ English translations added
- ✅ German translations added
- ✅ Keys match usage in LogbookView component
- ✅ Strings display correctly in both languages
- ✅ JSON files remain valid (no syntax errors)

---

### WP10: Documentation - Manifest Updates

**Objective**: Update project manifests with new commands, events, and flows

**Context**:
- Both projects require manifest updates
- Manifests are source of truth for future agents
- Need to document new API surface and data flows

**Dependencies**: All previous WPs (implementation complete)

**Files to Modify**:

---

#### Tauri Launcher Documentation

📄 **[Docs/Agents/ProjectManifest/public-api.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\Docs\Agents\ProjectManifest\public-api.md)**

**Add New Command Section**:

```markdown
### query_save_data_with_progress

**Signature**:
```rust
async fn query_save_data_with_progress(
    app: AppHandle,
    php_path: String,
    script_path: String,
    command: String,
    save: String,
    filter: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
    cache_key: Option<String>,
) -> Result<serde_json::Value, String>
```

**Description**: Query save data with real-time progress event streaming. Spawns PHP query CLI with `--json` flag, streams NDJSON progress events to frontend, returns final result.

**Parameters**:
- Same as `query_save_data` (see above)

**Returns**: 
- `Ok(serde_json::Value)` - Final query result (unwrapped from `{type: "result", data: ...}`)
- `Err(String)` - Error message

**Events Emitted**:
- `query-progress` - NDJSON progress events with payload:
  ```typescript
  {
    tool: "query",
    message: {
      type: "progress",
      name: string,        // e.g., "LOG_CACHE_BUILDING"
      status: "started" | "progress" | "complete",
      payload?: object,
      timestamp: string
    }
  }
  ```

**Differences from `query_save_data`**:
- Adds `--json` flag to PHP CLI
- Streams STDOUT line-by-line during execution
- Emits Tauri events for progress updates
- Same return value structure

**Usage**:
```typescript
import { invoke, listen } from '@tauri-apps/api';

const unlisten = await listen('query-progress', (event) => {
  console.log('Progress:', event.payload.message);
});

const result = await invoke('query_save_data_with_progress', {
  phpPath: config.phpPath,
  scriptPath: toolPaths.query,
  command: 'log',
  save: 'mysave',
  limit: 20
});

unlisten();
```
```

**Update Existing Command Documentation**:

Find `query_save_data` section and add note about new command:

```markdown
### query_save_data

[... existing documentation ...]

**See Also**: `query_save_data_with_progress` for streaming version with progress events.
```

---

📄 **[Docs/Agents/ProjectManifest/data-flows.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\Docs\Agents\ProjectManifest\data-flows.md)**

**Add New Section**:

```markdown
## Long-Running Query Flow with Progress

### Overview

Shows how logbook cache building progress is communicated from PHP backend to React UI.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User Action: Open Logbook (no cache exists)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LogbookView Component                                        │
│ - Calls useSaveData.query('log')                            │
│ - Shows loading spinner                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ useSaveData Hook                                             │
│ - invoke('query_save_data_with_progress', {...})            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Tauri: query_save_data_with_progress Command                │
│ - Spawn PHP: query.php --json log --save=X                  │
│ - Pipe STDOUT/STDERR                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                 ┌──────────────────────┐
│ STDOUT Stream    │                 │ STDERR Stream        │
│ (NDJSON events)  │                 │ (debug messages)     │
└──────────────────┘                 └──────────────────────┘
        ↓                                       ↓
        │                             ┌─────────────────────┐
        │                             │ eprintln! to console│
        │                             └─────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ Rust: Parse each STDOUT line                                │
│ - {"type":"progress","name":"LOG_CACHE_BUILDING",...}       │
│ - {"type":"result","data":{...}}                            │
└─────────────────────────────────────────────────────────────┘
        ↓
        ├─ Progress Event → emit('query-progress', {...})
        └─ Result → return data
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                 ┌──────────────────────┐
│ useQueryProgress │                 │ useSaveData (return) │
│ Hook             │                 │                      │
│ - Listens to     │                 │ - Receives result    │
│   query-progress │                 │ - Updates state      │
│ - Updates state: │                 └──────────────────────┘
│   inProgress=true│                            ↓
│   operation=     │                 ┌──────────────────────┐
│   "LOG_CACHE..." │                 │ LogbookView          │
└──────────────────┘                 │ - setData(result)    │
        ↓                             │ - Shows table        │
┌──────────────────┐                 └──────────────────────┘
│ LogbookView      │
│ - Shows banner:  │
│   "Building      │
│   logbook        │
│   index..."      │
└──────────────────┘
        ↓
        (Complete event received)
        ↓
┌──────────────────┐
│ LogbookView      │
│ - Hides banner   │
│ - Shows data     │
└──────────────────┘
```

### Event Sequence

1. **User opens logbook** → LogbookView fetches data via `useSaveData.query('log')`
2. **Tauri spawns PHP** → `query.php --json log --save=X`
3. **PHP emits started event** → `{"type":"progress","name":"LOG_CACHE_BUILDING","status":"started"}`
4. **Tauri emits frontend event** → `emit('query-progress', {...})`
5. **useQueryProgress updates** → `{inProgress: true, operation: "LOG_CACHE_BUILDING"}`
6. **LogbookView shows banner** → "Building logbook index..."
7. **PHP completes cache** → Emits `{"type":"progress","status":"complete"}`
8. **PHP emits result** → `{"type":"result","data":{...}}`
9. **Tauri returns result** → Promise resolves with data
10. **useQueryProgress clears** → `{inProgress: false}`
11. **LogbookView hides banner** → Shows loaded data

### Parallel Flows

**Progress Updates** (non-blocking):
- Events flow from PHP → Tauri → React state
- UI updates in real-time during operation
- Managed by `useQueryProgress` hook

**Data Fetching** (blocking):
- Tauri command waits for PHP process to complete
- Returns final result after all events
- Managed by `useSaveData` hook

### Components Involved

| Component | Role |
|-----------|------|
| LogbookView | Displays banner + data table |
| useSaveData | Invokes query command, returns result |
| useQueryProgress | Manages progress state from events |
| Tauri Command | Spawns PHP, streams events, returns result |
| PHP ProgressEmitter | Emits NDJSON events to STDOUT |
| PHP Log::toArrayForAPI | Generates cache, emits events |

### Error Handling

- **PHP process error**: Tauri returns `Err(String)`, useSaveData catches
- **JSON parse error**: Logged to console, continues processing
- **Timeout**: useQueryProgress clears progress after 30s
- **Missing result**: Tauri returns "No result received"
```

---

📄 **Regenerate Merged Manifest**:

Run:
```bash
cd x4-savegame-parser-launcher
node scripts/merge-manifests.js
```

This updates `X4-Savegame-Parser-Launcher-Manifest.md`.

---

#### PHP Backend Documentation

Already completed in WP4, but verify:

- ✅ [docs/agents/project-manifest/ndjson-interface.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\ndjson-interface.md) has Progress Events section
- ✅ [docs/agents/project-manifest/cli-api-reference.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\cli-api-reference.md) documents `--json` flag

**Regenerate PHP Merged Manifest**:
```bash
cd x4-savegame-parser
bin\merge-manifest.bat
```

---

**Success Criteria**:
- ✅ Tauri public-api.md documents new command
- ✅ Tauri data-flows.md includes progress flow diagram
- ✅ PHP documentation verified from WP4
- ✅ Both merged manifests regenerated
- ✅ All cross-references valid

---

## Verification Checklist

After implementing all work packages, verify system integration:

### End-to-End Tests

1. **PHP CLI Test**:
```bash
cd x4-savegame-parser
bin\query.bat --json log --save=test-save --limit=5
```
Expected: NDJSON events followed by result wrapper

2. **Tauri Command Test** (browser console):
```javascript
const { invoke, listen } = window.__TAURI__;

const unlisten = await listen('query-progress', (e) => {
  console.log('Event:', e.payload);
});

const result = await invoke('query_save_data_with_progress', {
  phpPath: 'C:\\...\\php.exe',
  scriptPath: 'C:\\...\\query.php',
  command: 'log',
  save: 'test-save',
  limit: 10
});

console.log('Result:', result);
unlisten();
```

3. **UI Integration Test**:
   - Start launcher: `npm run tauri dev`
   - Navigate to Logbook
   - Select save without cache
   - Verify blue banner appears
   - Verify data loads
   - Verify banner disappears

4. **Language Test**:
   - Switch to German in settings
   - Repeat UI test
   - Verify German text in banner

5. **Theme Test**:
   - Test in light mode
   - Test in dark mode
   - Verify banner styling adapts

### Documentation Verification

- ✅ All manifests updated
- ✅ Merged manifests regenerated
- ✅ Cross-references valid
- ✅ Code examples in docs work

---

## Implementation Notes

### Session Recovery Context

If picking up this work later, start with:

1. **Read Both AGENTS.md Files**: Understand architectural constraints
2. **Read Project Manifests**: 
   - PHP: `docs/agents/project-manifest/`
   - Launcher: `Docs/Agents/ProjectManifest/`
3. **Check WP Status**: Determine which packages are complete
4. **Verify Dependencies**: Ensure prerequisite WPs are implemented
5. **Run Tests**: Confirm existing functionality before proceeding

### Known Considerations

- **PHP 8.4+ Required**: Strict typing, constructor property promotion
- **React/TypeScript**: Functional components, hooks pattern
- **Tauri Async**: All commands use `tokio` async runtime
- **I18n Mandatory**: All UI strings must use `t()` function
- **Theme Support**: All styling must work in light/dark modes

### Rollback Strategy

Each WP can be rolled back independently:

- **WP1-4**: Git revert PHP changes
- **WP5-6**: Git revert Tauri changes (won't break existing command)
- **WP7-9**: Git revert frontend changes
- **WP10**: Regenerate manifests from previous commits

---

## Questions for Refinement

Before implementation, consider:

1. **Performance**: Should we add progress percentage to events (e.g., "50% complete")?
2. **Cancellation**: Should user be able to cancel cache building?
3. **Persistence**: Should progress state survive app restarts?
4. **Notifications**: Show OS notification when cache completes?
5. **Retry**: Auto-retry on failure or manual retry only?

---

**End of Implementation Plan**

### 1. PHP Backend - Add Progress Event Infrastructure

**[src/X4/SaveViewer/Data/SaveReader/Log.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\Data\SaveReader\Log.php) (lines ~192-200)**

Replace direct STDERR writes with event emission:

- Add method `emitProgressEvent(string $name, array $payload = [])` that checks if JSON mode is enabled
- JSON mode detection: Check for `JSON_OUTPUT_MODE` constant (to be defined by CLI wrapper)
- If JSON mode: Write NDJSON to STDOUT with `{type: "progress", name: "LOG_CACHE_BUILDING", status: "started"}`
- If not JSON mode: Keep existing STDERR messages
- Update `toArrayForAPI()` to emit `LOG_CACHE_BUILDING_STARTED` before generation, `LOG_CACHE_BUILDING_COMPLETE` after

**[src/X4/SaveViewer/SaveParser.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\SaveParser.php) (line ~154)**

Update `generateLogAnalysisCache()` method:

- Add same `emitProgressEvent()` logic pattern
- Emit events around cache generation call
- Keep existing `$this->log()` calls for non-JSON modes

**[bin/php/query.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\bin\php\query.php)**

Add JSON mode support:

- Add `--json` flag to CLI arguments (using `league/climate`)
- When enabled: Define `JSON_OUTPUT_MODE` constant before including classes
- Modify response: If JSON mode, emit NDJSON progress events during processing, then final JSON response with `{type: "result", data: {...}}` wrapper
- Ensure STDOUT flushing after each event: `flush()` after `echo`

**Create [src/X4/SaveViewer/Utilities/ProgressEmitter.php](f:\Webserver\www\htdocs\tools\x4-savegame-parser\src\X4\SaveViewer\Utilities\ProgressEmitter.php)** (new file)

Reusable progress event helper:

- Static methods: `emitStarted(string $operation)`, `emitComplete(string $operation)`, `emitProgress(string $operation, array $data)`
- Check `JSON_OUTPUT_MODE` constant
- Format NDJSON with timestamp, type: "progress"
- Flush STDOUT after emission

### 2. PHP Backend - Update Documentation

**[docs/agents/project-manifest/ndjson-interface.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\ndjson-interface.md)**

Add new section "Progress Events (CLI JSON Mode)":

- Document `LOG_CACHE_BUILDING_STARTED`, `LOG_CACHE_BUILDING_COMPLETE` events
- Explain `--json` flag behavior for query CLI
- Show event structure: `{type: "progress", name: "...", status: "started|complete", payload?: {...}, timestamp: "..."}`
- Show final result wrapper: `{type: "result", data: <original JSON response>}`

**[docs/agents/project-manifest/cli-api-reference.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\agents\project-manifest\cli-api-reference.md)**

Update query command section:

- Add `--json` flag documentation
- Explain streaming behavior vs standard output
- Link to NDJSON interface documentation

### 3. Tauri Backend - Add Streaming Query Command

**[src-tauri/src/lib.rs](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src-tauri\src\lib.rs)** (after line ~208)

Add new command `query_save_data_with_progress`:

- Clone existing `query_save_data` signature but without return of full data
- Add `--json` flag to PHP CLI arguments
- Use `tokio::process::Command` with `.stdout(Stdio::piped())`
- Spawn async task to read stdout lines with `BufReader::new(stdout).lines()`
- For each line: Parse JSON, emit `query-progress` Tauri event with tool name and parsed message
- Accumulate non-event lines (final result)
- When process completes: Parse final `{type: "result", data: {...}}` message and return data
- Handle errors: If process fails or JSON parsing fails, return `Err(String)`

**Error Handling**:
- If PHP process exits non-zero: Return stderr as error
- If final result not found: Return "No result received"
- If JSON parsing fails mid-stream: Log to console, continue processing

### 4. Tauri Backend - Update Existing Command (Fallback)

**[src-tauri/src/lib.rs](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src-tauri\src\lib.rs)** (line ~194-196)

Enhance STDERR handling in original `query_save_data`:

- If stderr contains "Generating log analysis cache": Emit `query-stderr` event with message
- Keep existing console logging
- This provides fallback for non-streamed queries

### 5. Frontend - Add Progress Event Listener Hook

**Create [src/hooks/useQueryProgress.ts](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\hooks\useQueryProgress.ts)** (new file)

Hook to manage query progress state:

- Return state: `{inProgress: boolean, operation: string | null, message: string | null}`
- `useEffect` to listen for `query-progress` Tauri events
- Parse event: If `type === "progress"` and `name === "LOG_CACHE_BUILDING"`:
  - `status === "started"` → Set `inProgress: true, operation: "cache"`
  - `status === "complete"` → Set `inProgress: false`
- Auto-clear after timeout (30s) to handle edge cases
- Cleanup listener on unmount

### 6. Frontend - Update SaveData Hook

**[src/hooks/useSaveData.ts](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\hooks\useSaveData.ts)** (line ~48-68)

Modify `query` function to use streaming command:

- Try `query_save_data_with_progress` first
- Fallback to original `query_save_data` if new command not available (backward compatibility)
- Keep existing error handling and caching logic
- Progress events handled externally by `useQueryProgress` hook

### 7. Frontend - Update LogbookView Component

**[src/components/LogbookView.tsx](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\components\LogbookView.tsx)** (around line ~73)

Add cache building indicator:

- Import `useQueryProgress` hook
- Destructure `{inProgress, operation}` from hook
- Add conditional banner above DataTable: `{inProgress && operation === 'cache' && <CacheBuildingBanner />}`
- Create inline component `CacheBuildingBanner`: Blue info box with loader icon, message: `t('logbook.cacheBuildingMessage')`
- Position banner between filters and table

### 8. Frontend - Add I18n Strings

**[src/locales/en.json](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\locales\en.json)**

Add translations under `logbook` section:

```json
{
  "logbook": {
    "cacheBuildingMessage": "Building logbook index for first-time access... This may take a moment.",
    "cacheBuildingTitle": "Indexing in Progress"
  }
}
```

**[src/locales/de.json](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\src\locales\de.json)**

Add German translations (same structure)

### 9. Documentation - Update Manifests

**PHP: Regenerate merged manifest**

Run: `bin\merge-manifest.bat` (Windows) to update [docs/X4-Savegame-Parser-Manifest.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser\docs\X4-Savegame-Parser-Manifest.md)

**Launcher: Update [Docs/Agents/ProjectManifest/public-api.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\Docs\Agents\ProjectManifest\public-api.md)**

Add `query_save_data_with_progress` command signature:

- Parameters: Same as `query_save_data`
- Return type: Same as `query_save_data`
- Events emitted: `query-progress` with `{tool: string, message: object}`
- Document streaming behavior

**Launcher: Update [Docs/Agents/ProjectManifest/data-flows.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\Docs\Agents\ProjectManifest\data-flows.md)**

Add section "Long-Running Query Flow with Progress":

- Diagram showing: UI → Tauri → PHP (--json) → NDJSON events → Tauri events → React state → UI updates
- Show parallel flows: Progress events update UI, final result updates data state

**Launcher: Regenerate merged manifest**

Run: `node scripts/merge-manifests.js` to update [X4-Savegame-Parser-Launcher-Manifest.md](f:\Webserver\www\htdocs\tools\x4-savegame-parser-launcher\X4-Savegame-Parser-Launcher-Manifest.md)

---

## Verification

1. **PHP CLI Test**: Run `bin\query.bat --json log --save=<save-id>` → Should output NDJSON events followed by result
2. **PHP Legacy Save Test**: Query legacy save (no cache) → Should emit `LOG_CACHE_BUILDING_STARTED` then `COMPLETE`
3. **Tauri Event Test**: Use browser dev tools to verify `query-progress` events are emitted during logbook load
4. **UI Test**: Open logbook for first time → Blue banner appears during cache build → Disappears when complete
5. **Fallback Test**: Verify old `query_save_data` still works for backward compatibility
6. **I18n Test**: Switch language to German → Banner text changes
7. **Theme Test**: Switch dark/light mode → Banner styling adapts

**Manual Testing Commands**:
```bash
# Test PHP progress events
bin\query.bat --json log --save=quickstart-20240101-120000

# Test UI integration (run launcher in dev mode)
npm run tauri dev
# Navigate to Logbook, select save without cache
```

---

## Decisions

- **NDJSON over STDERR**: Structured events are parseable and extensible; STDERR would require fragile string parsing
- **General pattern**: `ProgressEmitter` helper makes this reusable for any future long-running operations (e.g., large faction analysis)
- **`--json` flag**: Opt-in behavior preserves backward compatibility with existing CLI usage and scripts
- **Fallback command**: Keep original `query_save_data` to ensure launcher works with older PHP backend versions
- **Hook separation**: `useQueryProgress` isolated from `useSaveData` for cleaner state management and reuse across components
- **Final result wrapper**: `{type: "result", data: {...}}` distinguishes final response from progress events in stream
