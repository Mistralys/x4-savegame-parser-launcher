# Plan: Pending Features Completion

## Plan Audit Cycles
- Audits: 5 — Plan Auditor v1.5.0
- Architectural Reviews: 2 — Plan Architect Reviewer v1.6.0

## Summary

This plan consolidates all remaining unimplemented work across the x4-savegame-parser and x4-savegame-parser-launcher projects. A thorough codebase audit (June 2026) confirmed that all previously planned features for the viewer screens, NDJSON progress streaming, and CLI JSON mode are fully implemented. Two feature areas remain open: (1) dynamic logbook category metadata served from the PHP backend, which eliminates the hardcoded category dropdown in the launcher frontend, and (2) an automated installation wizard in the launcher that downloads and configures PHP and the monitor tool without requiring manual setup by the user.

## Architectural Context

**x4-savegame-parser (PHP)**
- `src/X4/SaveViewer/CLI/QueryHandler.php` — command routing via a `match` expression; new commands require a constant, a match arm, and a handler method.
- `src/X4/SaveViewer/CLI/QueryParameters.php` — value object for CLI params; `isJson` flag already populated from `--json` flag.
- `src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisCache.php` — reads/writes `analysis.json` keys; currently holds `KEY_CACHE_WRITTEN` and `KEY_CATEGORY_IDS`.
- `src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisWriter.php` — `writeFiles(DetectionCategories $collection)` method writes individual category JSON files and updates `analysis.json`; this is the injection point for metadata storage.
- `src/X4/SaveViewer/Data/SaveReader/Log/LogCategory.php` — exposes `getCategoryID()`, `getLabel()`, `countEntries()`.
- `src/X4/SaveViewer/Utilities/ProgressEmitter.php` — already implemented; used via `JSON_OUTPUT_MODE` constant set in `bin/php/query.php`.

**x4-savegame-parser-launcher (Tauri/React)**
- `src-tauri/src/lib.rs` — Tauri command hub; `query_save_data` and `query_save_data_with_progress` already registered.
- `src-tauri/Cargo.toml` — current dependencies: `tauri`, `serde`, `serde_json`, `tokio`, `chrono`, plus all Tauri v2 plugins; no HTTP or archive crates.
- `src/components/LogbookView.tsx` — the category dropdown iterates `Object.keys(CATEGORY_ICONS)`, a hardcoded map; does not reflect the save's actual categories or their counts.
- `src/hooks/useSaveData.ts` — `query()` method; always tries `query_save_data_with_progress` first with a fallback to `query_save_data`.
- `src/components/SettingsView.tsx` — environment & tools configuration UI; the natural home for a setup wizard trigger button.
- `src/locales/en.json` — all logbook category labels already present as `logbook.categories.*`; no setup/wizard strings exist yet.

## Approach / Architecture

### Feature 1 — Dynamic Logbook Category Metadata

The backend stores category metadata (ID, label, count) in `analysis.json` at cache-write time. A new `log-metadata` CLI command reads and returns this metadata. The frontend fetches metadata once on `LogbookView` mount and uses the result to populate the category dropdown dynamically, adding entry counts as labels.

The CATEGORY_ICONS and CATEGORY_COLORS maps in the frontend remain untouched — they provide UI presentation with graceful fallback to a generic icon for unknown categories. Only the dropdown population changes.

### Feature 2 — Installation Wizard

A new Rust command `download_and_install_tools` handles the full download-extract-configure flow, emitting `setup-progress` events (reusing the existing event bus pattern from `process-output`). A new `SetupWizard` React component embeds in `SettingsView`, triggered by a button in the "Environment & Tools" section. A separate `check_for_updates` command returns current vs. latest version metadata without performing any downloads.

## Rationale

- **Backend as source of truth for categories**: Category IDs and labels are defined in PHP (`LogCategories.php`, `DetectionCategories.php`); the frontend should not duplicate this list. Counts change per save. Storing metadata at cache-generation time avoids a separate read-all-categories scan at query time.
- **Reuse existing event bus**: `setup-progress` events follow the same Tauri `emit` pattern already used by `process-output` and `query-progress`, keeping the frontend event subscription model consistent.
- **No new Tauri plugin**: HTTP and ZIP operations are implemented directly with `reqwest` and `zip` crates rather than a Tauri plugin, since the installer is a one-shot background task, not a general-purpose capability.
- **SemVer compatibility check deferred to future plan**: Version range validation between launcher and monitor (the `^x.y.z` requirement) requires a versioning contract not yet established. The wizard will check GitHub for a newer version but will not block startup — this avoids over-engineering before a v1 release contract exists.

## Considered Alternatives

| Decision | Chosen Shape | Alternatives Considered | Trade-Off Summary |
|----------|--------------|-------------------------|-------------------|
| Category metadata storage location | Store in `analysis.json` alongside existing keys | Separate `_metadata.json` file; re-compute from category files at query time | `analysis.json` already exists and is read for cache validity; no new file-path logic required. Re-computing at query time adds latency on every metadata call. |
| Frontend category dropdown source | Fetch `log-metadata` command on mount | Keep hardcoded list; derive from loaded entries | Backend-driven list adapts to future category additions automatically and adds entry counts. Deriving from loaded entries requires loading all entries first. |
| Installation wizard placement | Inline section inside `SettingsView` | Full-screen modal; separate Settings tab | Settings view already has "Environment & Tools" section and a `BlockingModal` pattern; inline keeps navigation shallow. A dedicated tab adds UI chrome for an infrequent operation. |
| PHP download source | Pre-pinned URL from windows.php.net | Dynamic scrape of PHP releases page | Scraping requires HTML parsing; pinned URL is deterministic and can be updated in code when a new PHP version ships alongside the monitor. |
| Installation wizard module boundary | Dedicated `setup.rs` module | All logic inline in `lib.rs` | `lib.rs` is already ~380 lines; `process.rs` establishes the project pattern for separating a cohesive Rust concern into its own module. Inline in `lib.rs` works but would grow the file to 530+ lines of mixed async complexity alongside simple CRUD commands. `setup.rs` matches the established pattern with zero architectural risk. |
| `getLog()` call count in Step 1.3 handler | Single call stored in `$log` variable | Two separate calls — once for cache check, once for regeneration | Both approaches work because `Log` instances share the same underlying `FileAnalysis` object. However, the single-instance form is clearer and removes an implicit shared-state dependency that would otherwise require knowing the internals of `Log` to trust. |

## Pattern Alignment

| Pattern | Followed / Departed |
|---------|---------------------|
| New CLI command = constant + match arm + handler method in `QueryHandler.php` | Followed — identical to `COMMAND_LOG`, `COMMAND_SHIPS`, etc. |
| `analysis.json` used for save-level cache metadata | Followed — `KEY_CACHE_WRITTEN` and `KEY_CATEGORY_IDS` already there |
| Tauri commands return `Result<T, String>` | Followed — all existing commands do this |
| Tauri events emitted via `app.emit()` | Followed — same pattern as `process-output` |
| Frontend data fetch in `useCallback` + `useEffect` inside component | Followed — same as `ShipLossesView`, `OwnedShipsView`, `LogbookView` |
| All user-facing strings via `t()` from `I18nContext` | Followed |
| `useSaveData.query()` for all CLI data retrieval | Followed — `log-metadata` will use the same hook |

## Detailed Steps

### Phase 1 — PHP Backend: Category Metadata

**Step 1.1** — `LogAnalysisCache.php`: Add `KEY_CATEGORY_METADATA` constant and `getCategoryMetadata()` method.

File: `src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisCache.php`

- Add constant after existing constants:
  ```php
  public const string KEY_CATEGORY_METADATA = 'log-category-metadata';
  ```
- Add method after `getCacheDate()`:
  ```php
  /**
   * @return array<int, array{id: string, label: string, count: int}>
   */
  public function getCategoryMetadata() : array
  {
      return $this->analysis->getArray(self::KEY_CATEGORY_METADATA);
  }
  ```

**Step 1.2** — `LogAnalysisWriter.php`: Store metadata during `writeFiles()`.

File: `src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisWriter.php`

In `writeFiles(DetectionCategories $collection)`, after writing the per-category JSON files and before `$this->analysis->save()`, add:
```php
$metadata = [];
foreach ($categories as $category) {
    $metadata[] = [
        'id'    => $category->getCategoryID(),
        'label' => $category->getLabel(),
        'count' => $category->countEntries()
    ];
}
$this->analysis->setKey(LogAnalysisCache::KEY_CATEGORY_METADATA, $metadata);
```

**Step 1.3** — `QueryHandler.php`: Add `log-metadata` command.

File: `src/X4/SaveViewer/CLI/QueryHandler.php`

1. Add constant in the constants block:
   ```php
   public const string COMMAND_LOG_METADATA = 'log-metadata';
   ```
2. Add match arm in `executeCommand()`:
   ```php
   self::COMMAND_LOG_METADATA => $this->execute_logMetadata($save, $params),
   ```
3. Add handler method — call `getLog()` once and store in a variable, then reuse the same instance for both the cache validity check and generation. This avoids relying on the implicit shared-state coincidence that would make two separate `getLog()` calls work:
   ```php
   private function execute_logMetadata(BaseSaveFile $save, QueryParameters $params) : string
   {
       $reader = $save->getDataReader();
       $log    = $reader->getLog();
       $cache  = $log->getCacheInfo();
   
       if (!$cache->isCacheValid()) {
           // Generate analysis cache directly — avoids loading/sorting all log entries
           $log->generateAnalysisCache();
       }
   
       $metadata = $cache->getCategoryMetadata();
       return $this->outputSuccess(self::COMMAND_LOG_METADATA, $metadata, null, $params);
   }
   ```
   
   > **Verified**: The correct accessor chain is `$save->getDataReader()->getLog()`. `BaseSaveFile` exposes `getDataReader()` (not `getReader()`); every other handler in `QueryHandler.php` uses this method.

**Step 1.4** — Verify `analysis.json` serialization by running an extraction on a real save and inspecting the output JSON for the new `log-category-metadata` key.

---

### Phase 2 — Frontend: Dynamic Category Dropdown

**Step 2.1** — `LogbookView.tsx`: Add `CategoryMeta` interface and state.

```typescript
interface CategoryMeta {
  id: string;
  label: string;
  count: number;
}
```

Add state:
```typescript
const [categories, setCategories] = useState<CategoryMeta[]>([]);
```

**Step 2.2** — `LogbookView.tsx`: Fetch metadata on mount.

Add `fetchCategories` callback alongside the existing `fetchLogbook`:
```typescript
const fetchCategories = useCallback(async () => {
  try {
    const response = await query<CategoryMeta[]>(saveId, 'log-metadata', {});
    if (response.success && Array.isArray(response.data)) {
      setCategories(response.data);
    }
  } catch (err) {
    console.error('Failed to fetch logbook categories', err);
  }
}, [saveId, query]);

useEffect(() => {
  fetchCategories();
}, [fetchCategories]);
```

**Step 2.3** — `LogbookView.tsx`: Replace dropdown population.

Replace:
```tsx
{Object.keys(CATEGORY_ICONS).map(cat => (
  <option key={cat} value={cat}>{t(`logbook.categories.${cat}`)}</option>
))}
```

With:
```tsx
{categories.map(cat => {
  const label = t(`logbook.categories.${cat.id}`) === `logbook.categories.${cat.id}`
    ? cat.label
    : t(`logbook.categories.${cat.id}`);
  return (
    <option key={cat.id} value={cat.id}>
      {label} ({cat.count})
    </option>
  );
})}
```

**Step 2.4** — `LogbookView.tsx`: Guard: if `categories` is empty (metadata not yet loaded or command not available), fall back to the existing `Object.keys(CATEGORY_ICONS)` iteration so the dropdown is never blank. Additionally, when the fallback is triggered and a save is already loaded (indicating an old pre-feature cache), emit a non-blocking UI hint — e.g., a `NotificationContext` info entry — suggesting that re-extracting the save will enable category entry counts. This gives users a clear signal that the cache is stale without blocking the UI or forcing a re-extraction.

**Step 2.5** — `en.json` / `de.json` / `fr.json`: No new keys needed for this feature — the existing `logbook.categories.*` translations cover all labels.

---

### Phase 3 — PHP Backend: Manifest & Tests

**Step 3.1** — `docs/agents/project-manifest/public-api-reference.md` (x4-savegame-parser): Add the `COMMAND_LOG_METADATA` constant signature and `getCategoryMetadata()` method signature to `public-api-reference.md` (PHP-layer entries only; CLI command documentation with input/output schema belongs in `cli-api-reference.md`, covered by Step 6.4).

**Step 3.2** — Add two PHPUnit test files following the project's subdirectory convention (CLI tests in `tests/testsuites/CLI/`, data-layer tests in `tests/testsuites/Reader/`):

- `tests/testsuites/CLI/LogMetadataCommandTest.php` — call `QueryHandler::executeCommand(QueryHandler::COMMAND_LOG_METADATA, $params)` with a valid save fixture and assert the response contains an array under `data` with `id`, `label`, and `count` keys.
- `tests/testsuites/Reader/LogAnalysisCacheTest.php` — assert `getCategoryMetadata()` returns the metadata written by `LogAnalysisWriter::writeFiles()`.

---

### Phase 4 — Rust: Installation Wizard Backend

**Step 4.1** — `Cargo.toml`: Add dependencies.

```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
zip = "2"
futures-util = "0.3"
```

> **Note**: `semver` is intentionally omitted. Version comparison in `check_for_updates` uses an inline `trim_start_matches('v')` string equality check, which is sufficient for the current use case (update-available Y/N on exact tag matches). Add `semver = "1"` in a future plan when version range enforcement between launcher and monitor is established.

**Step 4.2** — `src-tauri/src/setup.rs` (new file): Following the `process.rs` pattern, extract all installation wizard logic into a dedicated module. `lib.rs` remains a pure command-registration hub.

Define public structs in `setup.rs`:

```rust
#[derive(Clone, serde::Serialize)]
pub struct SetupProgress {
    pub step: String,
    pub message: String,
    pub percent: u8,
}

#[derive(serde::Serialize)]
pub struct InstalledPaths {
    pub php_path: String,
    pub install_path: String,
}

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub current_version: Option<String>,
    pub latest_version: String,
    pub update_available: bool,
}
```

Add private async helper functions for each named stage. Decomposing into named helpers ensures precise error reporting — the frontend can display "failed while extracting PHP" rather than a generic error, and each stage can be independently retried or reported:

- `detect_os_arch() -> Result<(String, String), String>` — OS + architecture detection via `std::env::consts`
- `fetch_latest_release(client: &reqwest::Client) -> Result<String, String>` — GitHub API call; returns tag name
- `download_file(client: &reqwest::Client, url: &str, dest: &Path) -> Result<(), String>` — streaming download with overwrite semantics
- `extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), String>` — ZIP extraction; overwrites existing files
- `resolve_php_binary(extract_root: &Path) -> Result<PathBuf, String>` — locates `php.exe` after extraction

Public async functions (called from `lib.rs` thin wrappers):

```rust
pub async fn download_and_install_tools(app: AppHandle) -> Result<InstalledPaths, String>
pub async fn check_for_updates(current_version: Option<String>) -> Result<UpdateInfo, String>
```

Internal flow of `download_and_install_tools`:
1. Resolve `app.path().app_data_dir()` as the installation root.
2. Call `detect_os_arch()`, emit `setup-progress` with `step: "detecting"`.
3. Call `fetch_latest_release()`, emit `setup-progress` with `step: "fetching_release"`.
4. Call `download_file()` for monitor ZIP, emit `setup-progress` with `step: "downloading_monitor"`.
5. (Windows only) Call `download_file()` for PHP NTS x64 ZIP (hardcoded stable URL constant), emit `setup-progress` with `step: "downloading_php"`. Return a descriptive error on non-Windows.
6. Call `extract_zip()` for both ZIPs under `app_data_dir/tools/`, emit `setup-progress` with `step: "extracting"`.
7. Call `resolve_php_binary()` to locate `php.exe`.
8. Emit `setup-progress` with `step: "complete"`, `percent: 100`.
9. Return `InstalledPaths`.

For `check_for_updates`: fetch GitHub releases API, compare `tag_name.trim_start_matches('v')` against `current_version.as_deref().unwrap_or("").trim_start_matches('v')` using string equality.

**Step 4.3** — `lib.rs`: Add `mod setup;` declaration and thin command wrappers that delegate to `setup::*`.

```rust
mod setup;

#[tauri::command]
async fn download_and_install_tools(app: AppHandle) -> Result<setup::InstalledPaths, String> {
    setup::download_and_install_tools(app).await
}

#[tauri::command]
async fn check_for_updates(current_version: Option<String>) -> Result<setup::UpdateInfo, String> {
    setup::check_for_updates(current_version).await
}
```

Register in `tauri::generate_handler![]`:
```rust
download_and_install_tools,
check_for_updates,
```

---

### Phase 5 — React: Installation Wizard Frontend

**Step 5.1** — `src/components/SetupWizard.tsx` (new component).

- Props: `onComplete: (paths: InstalledPaths) => void`, `onClose: () => void`.
- State: `isRunning`, `progress: SetupProgress | null`, `error: string | null`.
- On mount: listen for `setup-progress` Tauri events.
- Renders a progress bar + current step message while `isRunning`.
- On success: calls `updateConfig` from `ConfigContext` with new paths, then `onClose()`.
- On error: shows error message with a retry button.

**Step 5.2** — `src/components/SettingsView.tsx`: Add "Auto-Setup Tools" button.

- In the "Environment & Tools" section (or a new "Installation" subsection), add an "Auto-Setup Tools" button that opens `SetupWizard` as a modal (use existing `BlockingModal` pattern or an inline overlay).
- Show this button only when `config.phpPath` or `config.installPath` is empty/invalid.
- Optionally add a separate "Check for Updates" button that calls `check_for_updates` and shows an inline "Update available: v{latest}" message.

**Step 5.3** — `src/locales/en.json`: Add setup wizard strings.

```json
"setup": {
  "title": "Auto-Setup Tools",
  "subtitle": "Download and configure PHP and the Savegame Monitor automatically.",
  "button_start": "Auto-Setup Tools",
  "button_check_updates": "Check for Updates",
  "button_cancel": "Cancel",
  "step_detecting": "Detecting system...",
  "step_fetching_release": "Fetching latest release info...",
  "step_downloading_monitor": "Downloading Savegame Monitor...",
  "step_downloading_php": "Downloading PHP...",
  "step_extracting": "Extracting files...",
  "step_complete": "Setup complete!",
  "update_available": "Update available: v{version}",
  "up_to_date": "You are up to date.",
  "error_unsupported_os": "Automatic PHP setup is only supported on Windows. Please install PHP manually.",
  "error_download_failed": "Download failed: {message}"
}
```

Mirror new keys to `de.json` and `fr.json` (machine-translated strings acceptable as initial placeholder).

---

### Phase 6 — Documentation Updates

**Step 6.1** — Launcher `docs/agents/project-manifest/public-api.md`: Add `download_and_install_tools` and `check_for_updates` command signatures + event `setup-progress`.

**Step 6.2** — Launcher `docs/agents/project-manifest/tech-stack.md`: Add `reqwest`, `zip`, `futures-util` to the Libraries section.

**Step 6.3** — Parser `docs/agents/project-manifest/public-api-reference.md`: Add `log-metadata` CLI command entry.

**Step 6.4** — Parser `docs/agents/project-manifest/cli-api-reference.md`: Add `log-metadata` command with input/output schema example.

**Step 6.5** — Launcher `docs/agents/project-manifest/data-flows.md`: Add the installation wizard flow — user triggers setup → Rust `download_and_install_tools` downloads and extracts PHP and monitor ZIPs → `InstalledPaths` returned → `ConfigContext` updated with new paths.

**Step 6.6** — Launcher `docs/agents/project-manifest/detail-screens.md`: Add a `SetupWizard` entry describing the component's purpose (embedded in `SettingsView`), trigger condition (`phpPath` or `installPath` absent/invalid), props (`onComplete`, `onClose`), and internal state (`isRunning`, `progress`, `error`).

**Step 6.7** — Launcher `docs/agents/project-manifest/file-tree.md`: Add `src-tauri/src/setup.rs` and `src/components/SetupWizard.tsx` to the launcher directory tree.

## Dependencies

- `LogAnalysisCache.php` metadata getter (Step 1.1) must exist before `LogAnalysisWriter.php` references the new constant (Step 1.2).
- PHP backend Steps 1.1–1.3 must be complete before frontend Steps 2.1–2.4 can be tested end-to-end.
- Rust Steps 4.1–4.3 must be complete before React Steps 5.1–5.2 can be tested end-to-end.
- Documentation steps (Phase 6) are independent of all other steps and can be done in parallel or at the end.

## Required Components

**Modified — x4-savegame-parser**
- `src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisCache.php`
- `src/X4/SaveViewer/Data/SaveReader/Log/LogAnalysisWriter.php`
- `src/X4/SaveViewer/CLI/QueryHandler.php`
- `docs/agents/project-manifest/public-api-reference.md`
- `docs/agents/project-manifest/cli-api-reference.md`

**New — x4-savegame-parser**
- `tests/testsuites/CLI/LogMetadataCommandTest.php`
- `tests/testsuites/Reader/LogAnalysisCacheTest.php`

**Modified — x4-savegame-parser-launcher**
- `src/components/LogbookView.tsx`
- `src/components/SettingsView.tsx`
- `src-tauri/src/lib.rs`
- `src-tauri/Cargo.toml`
- `src/locales/en.json`
- `src/locales/de.json`
- `src/locales/fr.json`
- `docs/agents/project-manifest/public-api.md`
- `docs/agents/project-manifest/tech-stack.md`
- `docs/agents/project-manifest/data-flows.md`
- `docs/agents/project-manifest/detail-screens.md`
- `docs/agents/project-manifest/file-tree.md`

**New — x4-savegame-parser-launcher**
- `src-tauri/src/setup.rs`
- `src/components/SetupWizard.tsx`

## Assumptions

- `BaseSaveFile::getDataReader()` returns a `SaveReader` and `SaveReader::getLog()` returns the `Log` object. This has been verified against the codebase — `getDataReader()` is the correct method name.
- The GitHub releases API (`/releases/latest`) returns a JSON object with a `tag_name` field — the standard GitHub API contract.
- The monitor's GitHub repository is `Mistralys/x4-savegame-parser` — inferred from the installation plan; verify before hardcoding in Rust.
- PHP download is Windows-only for the initial wizard implementation. Linux/macOS support is deferred.
- The `BlockingModal` component (already in the launcher) can be reused or adapted to host the `SetupWizard` content.

## Constraints

- **Tauri v2 only** — no Tauri v1 API usage.
- **PHP 8.4+ strict types** — all new PHP code must use `declare(strict_types=1)` and full type hints.
- **All frontend strings via `t()`** — no literal user-visible strings in JSX.
- **No new Tauri plugin** — HTTP and ZIP via Rust crates directly.
- **`CATEGORY_ICONS` / `CATEGORY_COLORS` maps stay in frontend** — icon and color assignment remains a UI concern; only the dropdown population changes.

## Out of Scope

- SemVer version range enforcement between launcher and monitor (version contract not yet established).
- Linux / macOS PHP auto-download (the wizard will error gracefully on non-Windows OSes with a "manual install" message).
- Stations detail screen (mentioned in earlier navigation plan as "future").
- UI redesign or structural refactoring of existing screens.

## Acceptance Criteria

- [ ] Running `bin/query log-metadata --save=<id>` returns a JSON array where each entry has `id`, `label`, and `count` fields.
- [ ] After extracting a save, `analysis.json` contains a `log-category-metadata` key with the metadata array.
- [ ] The category dropdown in `LogbookView` is populated from the API response and shows entry counts (e.g., "Combat (45)").
- [ ] If `log-metadata` is unavailable (e.g., old parser version), the dropdown falls back to the existing hardcoded list without errors.
- [ ] Clicking "Auto-Setup Tools" in Settings downloads, extracts, and configures PHP and the monitor, emitting visible progress steps.
- [ ] After successful setup, `phpPath` and `installPath` in the app config are updated automatically.
- [ ] `check_for_updates` returns `update_available: true` when a newer GitHub release exists.
- [ ] All new strings appear correctly in English; German and French show placeholder translations.
- [ ] PHPStan at level 6 passes for modified PHP files.
- [ ] No TypeScript errors in modified frontend files.

## Testing Strategy

**PHP backend**: PHPUnit test that exercises the `log-metadata` command end-to-end against an existing test fixture save. Verify the `analysis.json` cache is written and that `getCategoryMetadata()` returns a non-empty array with the expected shape.

**Frontend (LogbookView)**: Vitest + React Testing Library test that mocks `useSaveData.query()` to return a `CategoryMeta[]` and verifies the dropdown renders the correct options with counts. Test the fallback path by returning an empty array from the mock.

**Rust (installation wizard)**: Manual integration test — run the wizard against a local mock server or against the real GitHub API in a dev build, verify `InstalledPaths` paths exist on disk. Unit testing for path resolution logic is possible but the core value is the end-to-end flow.

## Test Plan

- `tests/testsuites/CLI/LogMetadataCommandTest.php` (new file) — Asserts `bin/query log-metadata --save=<fixture>` returns `success: true` and `data` array contains entries with `{id, label, count}` shape. Covers acceptance criterion 1.
- `tests/testsuites/Reader/LogAnalysisCacheTest.php` (new file) — Asserts `getCategoryMetadata()` returns the metadata written by `LogAnalysisWriter.writeFiles()`. Covers acceptance criterion 2.
- `src/components/LogbookView.test.tsx` (new file) — Mocks `useSaveData` to return category metadata and verifies dropdown renders `"Combat (45)"` style options. Tests fallback by returning empty array. Covers acceptance criteria 3 and 4.

## Documentation Updates

- `x4-savegame-parser/docs/agents/project-manifest/public-api-reference.md` — Add `log-metadata` command signature, input parameters (save identifier), and output schema `{id, label, count}[]`.
- `x4-savegame-parser/docs/agents/project-manifest/cli-api-reference.md` — Add full `log-metadata` entry with example invocation and response.
- `x4-savegame-parser-launcher/docs/agents/project-manifest/public-api.md` — Add `download_and_install_tools` and `check_for_updates` command signatures; add `setup-progress` to the Events section.
- `x4-savegame-parser-launcher/docs/agents/project-manifest/tech-stack.md` — Add `reqwest`, `zip`, `futures-util` to Libraries section.
- `x4-savegame-parser-launcher/docs/agents/project-manifest/data-flows.md` — Add the installation wizard flow: user triggers → Rust download/extract → `InstalledPaths` returned → config updated.
- `x4-savegame-parser-launcher/docs/agents/project-manifest/detail-screens.md` — Add a `SetupWizard` entry (purpose, trigger condition, props, state).
- `x4-savegame-parser-launcher/docs/agents/project-manifest/file-tree.md` — Add `src-tauri/src/setup.rs` and `src/components/SetupWizard.tsx` to the launcher tree.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **`BaseSaveFile` accessor chain in Step 1.3 differs from assumption** | Read `BaseSaveFile.php` and `SaveReader.php` public APIs before implementing the handler method; adjust the chain accordingly. |
| **GitHub API rate-limiting during development** | Cache the release API response in the Rust command for the session, or use a static fallback version string during development. |
| **PHP download URL changes or becomes unavailable** | Pin the URL to a stable versioned path (e.g., `php-8.3.x-nts-Win32-vs16-x64.zip`) in a named constant in `lib.rs`. Document the update procedure in the manifest. |
| **`analysis.json` written before `log-category-metadata` key exists (old extracts)** | `getCategoryMetadata()` returns an empty array when the key is absent (AppUtils `getArray` returns `[]` for missing keys). The frontend fallback in Step 2.4 handles this gracefully. |
| **ZIP file extraction conflicts on re-install** | The `extract_zip()` private helper in `setup.rs` uses overwrite semantics. Because the installation flow is decomposed into named private functions, a failure here is reported as "failed while extracting PHP/monitor" rather than a generic error, giving the user actionable context. Optionally back up the previous install directory before extraction. |
