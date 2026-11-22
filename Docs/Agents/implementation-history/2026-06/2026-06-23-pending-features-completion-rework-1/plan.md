# Plan

## Plan Audit Cycles
- Audits: 1 — Plan Auditor v1.5.0
- Architectural Reviews: 2 — Plan Architect Reviewer v1.6.0

## Prior Project Context
This plan addresses the deferred items identified in the synthesis report of `2026-06-23-pending-features-completion`. That project delivered the final two feature areas (log category metadata + installation wizard) across both the PHP parser and Tauri launcher. The synthesis documented eight follow-up items (D-01 through D-08); five are selected here based on the user's preference for DX improvements and thinking ahead.

## Summary
Address five deferred items from the preceding synthesis: fix Rust clippy warnings in `process.rs` (D-01), make the PHP download URL and monitor asset name configurable in `setup.rs` via a `SetupConfig` parameter (D-02 + D-03), internationalise the remaining hardcoded English strings in `SettingsView.tsx` (D-04), and extract shared Tauri IPC payload types from component files into a dedicated `src/types/shared.ts` module (D-05).

Items **D-06** (ModalOverlay generalisation), **D-07** (setup.rs unit tests), and **D-08** (LogbookView fetch race condition) are excluded: D-06 is speculative with only two consumers; D-07 offers low ROI for I/O-heavy network code; D-08 is a pre-existing benign pattern across multiple screens.

## Architectural Context

### Rust Backend (`src-tauri/src/`)
- [lib.rs](src-tauri/src/lib.rs) — Command registration, plugin setup, thin `#[tauri::command]` wrappers.
- [process.rs](src-tauri/src/process.rs) — `ProcessManager` for managing PHP child processes. Has two pre-existing clippy warnings.
- [setup.rs](src-tauri/src/setup.rs) — Installation wizard: `download_and_install_tools` and `check_for_updates`. Currently hardcodes `PHP_DOWNLOAD_URL` as a pinned constant (`php-8.4.8`) and constructs the monitor asset name inline as `x4-savegame-parser.zip`.

### React Frontend (`src/`)
- [SetupWizard.tsx](src/components/SetupWizard.tsx) — Exports `SetupProgress`, `InstalledPaths` interfaces that are Tauri IPC payload types.
- [SettingsView.tsx](src/components/SettingsView.tsx) — Contains five hardcoded English section headings that bypass `t()`.
- [useQueryProgress.ts](src/hooks/useQueryProgress.ts) — Exports `QueryProgress` interface (also a Tauri IPC payload type).

### i18n Locale Files
- [en.json](src/locales/en.json), [de.json](src/locales/de.json), [fr.json](src/locales/fr.json)

## Approach / Architecture

### D-01: Clippy Fixes in `process.rs`
Run `cargo clippy` against the workspace, fix all warnings in `process.rs`. The synthesis identified an unused import and a dropped async kill — verify against actual clippy output and apply the minimal fix.

### D-02 + D-03: Configurable Setup URLs
Introduce a `SetupConfig` struct that the `download_and_install_tools` command accepts as an optional parameter. This struct carries optional overrides for the PHP download URL and the monitor asset name. When fields are `None`, the compiled-in defaults are used. This solves both D-02 (PHP version configurability) and D-03 (asset name verification) in one change.

**Shape:**
```rust
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupConfig {
    pub php_download_url: Option<String>,
    pub monitor_asset_name: Option<String>,
}
```

The `download_and_install_tools` signature changes from:
```rust
pub async fn download_and_install_tools(app: AppHandle) -> Result<InstalledPaths, String>
```
to:
```rust
pub async fn download_and_install_tools(app: AppHandle, config: Option<SetupConfig>) -> Result<InstalledPaths, String>
```

The thin wrapper in `lib.rs` passes through the new parameter. The frontend's existing `invoke('download_and_install_tools')` call continues to work because the parameter is optional (Tauri deserialises missing fields as `None`).

Constants are renamed for clarity:
- `PHP_DOWNLOAD_URL` → `DEFAULT_PHP_DOWNLOAD_URL`
- New constant: `DEFAULT_MONITOR_ASSET_NAME` = `"x4-savegame-parser.zip"`

The inline asset name construction is replaced with a reference to the constant/override.

### D-04: i18n Section Headings in SettingsView
Add translation keys for the five hardcoded section headings currently in `SettingsView.tsx`:
- `"Appearance"` → `t('settings.sections.appearance')`
- `"Environment & Tools"` → `t('settings.sections.environment')`
- `"Debugging"` → `t('settings.sections.debugging')`
- `"Web Server"` → `t('settings.sections.web_server')`
- `"Switch Theme"` → `t('settings.sections.switch_theme')`

Add the corresponding keys to all three locale files.

### D-05: Shared Tauri Types Module
Create `src/types/shared.ts` to centralise TypeScript interfaces shared across component and hook boundaries:
- `SetupProgress` (from `SetupWizard.tsx`)
- `InstalledPaths` (from `SetupWizard.tsx`)
- `UpdateInfo` (from `SetupWizard.tsx`)
- `QueryProgress` (from `useQueryProgress.ts`)

The file is named `shared.ts` rather than `tauri.ts` because `QueryProgress` is a React state shape derived from Tauri events — its fields (`inProgress`, `operation`, `message`, `startTime`) are determined by hook logic, not by Tauri's serde deserialisation. The name `shared.ts` accurately reflects the directory's purpose: a home for types shared across module boundaries, some of which happen to be direct Tauri IPC payloads.

Update the original files to import from the shared module. No runtime changes — purely a code organisation improvement.

## Rationale
- **D-01**: Clean clippy output is table-stakes Rust DX. Warnings accumulate and mask real issues.
- **D-02 + D-03**: A pinned URL requiring a code change, recompile, and release for every PHP patch is friction. An optional config parameter removes that friction while maintaining the current zero-config default behaviour.
- **D-04**: Mixed hardcoded/translated strings is a consistency defect that confuses contributors and blocks non-English users on those labels.
- **D-05**: Tauri IPC types represent a contract between Rust and TypeScript. Centralising them in one file makes the contract explicit and prevents definition drift as more commands are added.

## Considered Alternatives

| Decision | Chosen Shape | Alternatives Considered | Trade-Off Summary |
|----------|--------------|-------------------------|-------------------|
| D-02 config mechanism | Optional `SetupConfig` parameter on Tauri command | (A) Config file in app data dir read by Rust; (B) Derive PHP URL from GitHub release assets/manifest | `SetupConfig` parameter is zero-infrastructure: no file I/O, no new release artifacts, and the frontend can provide overrides in future without backend changes. Option B is more robust long-term but requires changes to the parser repo's release process. |
| D-03 asset name | Named constant + override field in `SetupConfig` | (A) Parse asset list from GitHub Releases API dynamically | A constant with override is simpler and avoids an extra API call. Dynamic discovery is more resilient but over-engineered for a single known artifact. |
| D-05 type location | `src/types/shared.ts` | (A) `src/types/tauri.ts`; (B) `src/services/tauri-types.ts`; (C) Co-locate in each hook/component | `shared.ts` is preferred over `tauri.ts` because `QueryProgress` is a React state shape, not a direct Tauri event payload — `tauri.ts` would misrepresent the file's contract. `services/` implies runtime logic; co-location is the current state causing import coupling. A dedicated `types/` directory is the standard TypeScript convention. |

## Pattern Alignment
- **Rust `Result<T, String>` return** ([setup.rs](src-tauri/src/setup.rs)) — followed. No departure.
- **`#[serde(rename_all = "camelCase")]`** on Tauri-facing structs ([lib.rs](src-tauri/src/lib.rs) `ToolConfig`) — followed for `SetupConfig`.
- **Optional Tauri command parameters** (`query_save_data` uses `Option<String>`, `Option<u32>` extensively in [lib.rs](src-tauri/src/lib.rs)) — followed. `Option<SetupConfig>` uses the same pattern.
- **i18n via `t()` from `I18nContext`** ([constraints.md](docs/agents/project-manifest/constraints.md)) — D-04 restores compliance.
- **Type exports from components** — D-05 departs from the current pattern (types defined in the component that uses them) in favour of `src/types/shared.ts`. Justified because these types are shared across module boundaries; `QueryProgress` in particular is a React state shape that is not component-local state, and `SetupProgress`/`InstalledPaths`/`UpdateInfo` are Tauri IPC payloads consumed in multiple places.

## Detailed Steps

### Step 1 — Fix clippy warnings in `process.rs` (D-01)
1. Run `cargo clippy` in `src-tauri/` and capture the warnings for `process.rs`.
2. Fix each warning:
   - If an unused import exists (e.g. `std::os::windows::process::CommandExt`), remove it.
   - If `child.kill()` returns a value that clippy flags as silently dropped, handle it properly (use `let _ = child.start_kill()` or `.ok()` as appropriate for the async context).
   - Address any other warnings clippy reports.
3. Run `cargo clippy` again to confirm zero warnings in `process.rs`.

### Step 2 — Make setup URLs configurable (D-02 + D-03)
1. In [setup.rs](src-tauri/src/setup.rs):
   - Rename `PHP_DOWNLOAD_URL` to `DEFAULT_PHP_DOWNLOAD_URL`.
   - Add `const DEFAULT_MONITOR_ASSET_NAME: &str = "x4-savegame-parser.zip";`.
   - Define `SetupConfig` struct with `php_download_url: Option<String>` and `monitor_asset_name: Option<String>`, using `#[derive(serde::Deserialize)]` and `#[serde(rename_all = "camelCase")]`.
   - Update `download_and_install_tools` signature to accept `config: Option<SetupConfig>`.
   - At the top of the function body, resolve effective values:
     ```rust
     let cfg = config.unwrap_or_default();
     let php_url = cfg.php_download_url
         .unwrap_or_else(|| DEFAULT_PHP_DOWNLOAD_URL.to_string());
     let asset_name = cfg.monitor_asset_name
         .unwrap_or_else(|| DEFAULT_MONITOR_ASSET_NAME.to_string());
     ```
   - Replace the usage of `PHP_DOWNLOAD_URL` with `&php_url`.
   - Replace the inline `"x4-savegame-parser.zip"` in the monitor URL construction with `&asset_name`.
   - Implement `Default` for `SetupConfig` (derive or manual, all fields `None`).
2. In [lib.rs](src-tauri/src/lib.rs):
   - Update the thin `download_and_install_tools` wrapper to accept and forward the `config` parameter.
3. Run `cargo check` and `cargo clippy` to confirm clean compilation.

### Step 3 — Internationalise SettingsView section headings (D-04)
1. In [en.json](src/locales/en.json), add under `"settings"`:
   ```json
   "sections": {
     "appearance": "Appearance",
     "environment": "Environment & Tools",
     "debugging": "Debugging",
     "web_server": "Web Server",
     "switch_theme": "Switch Theme"
   }
   ```
2. In [de.json](src/locales/de.json), add the German translations:
   ```json
   "sections": {
     "appearance": "Darstellung",
     "environment": "Umgebung & Werkzeuge",
     "debugging": "Fehlersuche",
     "web_server": "Webserver",
     "switch_theme": "Thema wechseln"
   }
   ```
3. In [fr.json](src/locales/fr.json), add the French translations:
   ```json
   "sections": {
     "appearance": "Apparence",
     "environment": "Environnement & Outils",
     "debugging": "Débogage",
     "web_server": "Serveur Web",
     "switch_theme": "Changer de thème"
   }
   ```
4. In [SettingsView.tsx](src/components/SettingsView.tsx), replace each hardcoded string:
   - `"Appearance"` → `{t('settings.sections.appearance')}`
   - `"Environment & Tools"` → `{t('settings.sections.environment')}`
   - `"Switch Theme"` → `{t('settings.sections.switch_theme')}`
   - `"Debugging"` → `{t('settings.sections.debugging')}`
   - `"Web Server"` → `{t('settings.sections.web_server')}`

### Step 4 — Extract shared types to `src/types/shared.ts` (D-05)
1. Create [src/types/shared.ts](src/types/shared.ts) with the following interfaces:
   - `SetupProgress` (moved from `SetupWizard.tsx`)
   - `InstalledPaths` (moved from `SetupWizard.tsx`)
   - `UpdateInfo` (moved from `SetupWizard.tsx`)
   - `QueryProgress` (moved from `useQueryProgress.ts`)
2. In [SetupWizard.tsx](src/components/SetupWizard.tsx):
   - Remove the local `SetupProgress`, `InstalledPaths`, and `UpdateInfo` interface definitions.
   - Add `import type { SetupProgress, InstalledPaths, UpdateInfo } from '../types/shared';`
   - Keep the re-exports (`export type { SetupProgress, InstalledPaths }`) so that existing imports in [SettingsView.tsx](src/components/SettingsView.tsx) continue to work without changes.
3. In [useQueryProgress.ts](src/hooks/useQueryProgress.ts):
   - Remove the local `QueryProgress` interface definition.
   - Add `import type { QueryProgress } from '../types/shared';`
   - Keep the re-export so downstream consumers are unaffected.
4. Run `tsc --noEmit` to confirm no type errors.

### Step 5 — Verification
1. `cargo clippy` — zero warnings in `process.rs` and `setup.rs`.
2. `cargo check` — clean compilation.
3. `tsc --noEmit` — clean TypeScript compilation.
4. `npx vitest run` — all existing tests pass.

## Dependencies
- No external dependencies. All changes use existing libraries and patterns.
- Steps 1–4 are independent and can be implemented in any order or in parallel.

## Required Components
- [src-tauri/src/process.rs](src-tauri/src/process.rs) — clippy fixes (D-01)
- [src-tauri/src/setup.rs](src-tauri/src/setup.rs) — `SetupConfig`, constant renames, signature change (D-02 + D-03)
- [src-tauri/src/lib.rs](src-tauri/src/lib.rs) — wrapper update for new parameter (D-02 + D-03)
- [src/components/SettingsView.tsx](src/components/SettingsView.tsx) — i18n string replacement (D-04)
- [src/locales/en.json](src/locales/en.json) — new translation keys (D-04)
- [src/locales/de.json](src/locales/de.json) — new translation keys (D-04)
- [src/locales/fr.json](src/locales/fr.json) — new translation keys (D-04)
- `src/types/shared.ts` — **new file**, shared types across module boundaries (D-05)
- [src/components/SetupWizard.tsx](src/components/SetupWizard.tsx) — import update (D-05)
- [src/hooks/useQueryProgress.ts](src/hooks/useQueryProgress.ts) — import update (D-05)

## Assumptions
- The `cargo clippy` warnings described in the synthesis are still present (they will be verified in Step 1).
- The `SetupConfig` parameter with all-`Option` fields will deserialise correctly as `None` when the frontend omits it from the `invoke` call. This is confirmed by the existing `Option<String>`, `Option<u32>` pattern on `query_save_data` in [lib.rs](src-tauri/src/lib.rs).
- German and French translations for section headings are straightforward and don't require native speaker review for this scope.

## Constraints
- All `#[tauri::command]` functions must return `Result<T, E>` per [constraints.md](docs/agents/project-manifest/constraints.md).
- All user-facing strings must use `t()` per [constraints.md](docs/agents/project-manifest/constraints.md).
- The existing `invoke('download_and_install_tools')` call in `SetupWizard.tsx` must continue to work without changes (backward compatibility via optional parameter).

## Out of Scope
- **D-06**: Generalising `BlockingModal` into a reusable `ModalOverlay` primitive — only two consumers exist; speculative.
- **D-07**: Unit tests for `setup.rs` — I/O-heavy network code with low test ROI.
- **D-08**: Fetch race condition in `LogbookView` — pre-existing benign pattern across multiple screens.
- Changing the parser repo's GitHub release process to include a manifest file.
- Exposing `SetupConfig` in the settings UI — the parameter is available for future use but no UI is added in this plan.

## Acceptance Criteria
- `cargo clippy` reports zero warnings for `process.rs`.
- `download_and_install_tools` accepts an optional `SetupConfig` with `phpDownloadUrl` and `monitorAssetName` fields.
- When `SetupConfig` is omitted or fields are `None`, existing default URLs are used (backward compatible).
- All five hardcoded English section headings in `SettingsView.tsx` are replaced with `t()` calls.
- Translation keys exist in `en.json`, `de.json`, and `fr.json` for all new section headings.
- `src/types/shared.ts` exists and exports `SetupProgress`, `InstalledPaths`, `UpdateInfo`, and `QueryProgress`.
- Existing imports of these types from their original locations still work (re-exports preserved).
- `cargo check` and `cargo clippy` pass cleanly.
- `tsc --noEmit` passes cleanly.
- All existing Vitest tests pass.

## Testing Strategy
This is a cleanup/DX plan with no new user-facing features. Testing focuses on non-regression: the existing test suites must continue to pass, and the Rust and TypeScript compilers must report zero errors/warnings.

## Test Plan
- `cargo clippy -- -D warnings` in `src-tauri/` — Asserts zero warnings — Covers D-01 acceptance criterion
- `cargo check` in `src-tauri/` — Asserts clean compilation after `SetupConfig` changes — Covers D-02 + D-03 acceptance criteria
- `tsc --noEmit` — Asserts no TypeScript errors after type extraction and import changes — Covers D-05 acceptance criterion
- `npx vitest run` — Asserts all existing tests pass — Covers all acceptance criteria (non-regression)

## Documentation Updates
- [docs/agents/project-manifest/public-api.md](docs/agents/project-manifest/public-api.md) — Update `download_and_install_tools` signature to include `config: Option<SetupConfig>` parameter; add `SetupConfig` struct documentation.
- [docs/agents/project-manifest/file-tree.md](docs/agents/project-manifest/file-tree.md) — Add `src/types/shared.ts` entry.
- [docs/agents/project-manifest/tech-stack.md](docs/agents/project-manifest/tech-stack.md) — Note the `src/types/` directory convention for types shared across module boundaries (not exclusively Tauri IPC payloads) under Architectural Patterns.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| **Clippy warnings differ from synthesis description** | Step 1 runs `cargo clippy` first to capture actual warnings, rather than trusting the synthesis verbatim. Fix whatever clippy actually reports. |
| **`Option<SetupConfig>` deserialisation edge case** | The pattern is already proven by `query_save_data`'s multiple `Option<T>` parameters in `lib.rs`. If Tauri omits the field, it deserialises as `None`. |
| **Re-export breakage when moving types** | Step 4 explicitly preserves re-exports from the original files, so no downstream import needs to change. |
