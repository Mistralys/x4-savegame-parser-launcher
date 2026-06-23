# Installation Improvement Plan

Simplifying the monitor installation by providing an automated setup wizard that downloads portable PHP and the monitor project as ZIP files.

## High-Level Workflow
1. User clicks "Auto-Setup Tools" in Settings (or triggered automatically if tools are missing).
2. Launcher determines a local installation directory within its own application data folder.
3. Launcher downloads portable PHP (Windows x64) and the Monitor ZIP.
4. Launcher extracts both into the local directory.
5. Launcher updates `phpPath` and `installPath` in its internal configuration.
6. Launcher automatically creates the `config.json` for the monitor using existing `save_tool_config` logic.

## Backend (Rust)
- [ ] Add `reqwest`, `zip-extract`, `futures-util`, and `semver` dependencies to `src-tauri/Cargo.toml`.
- [ ] Implement `download_and_install_tools` command in `src-tauri/src/lib.rs`.
    - [ ] Use `AppHandle::path().app_data_dir()` to find a suitable local folder.
    - [ ] Fetch latest release version from GitHub API (`https://api.github.com/repos/Mistralys/x4-savegame-parser/releases/latest`).
    - [ ] Detect Host OS and Architecture.
    - [ ] Select appropriate PHP download URL:
        - **Windows**: `https://windows.php.net/downloads/releases/php-8.3.2-nts-Win32-vs16-x64.zip`
        - **Linux**: Static binary source (e.g., `https://github.com/crazywhalecc/static-php-cli/releases`)
        - **macOS**: Static binary source or Homebrew check.
    - [ ] Download Monitor from the latest release asset (or `archive/refs/tags/{version}.zip`).
    - [ ] Extract files to the app data directory.
    - [ ] Emit `setup-progress` events with status messages and percentage.
- [ ] Implement `check_for_updates` command.
    - [ ] Compare local version (from `MONITOR_STARTED` event or a local version file) with GitHub latest.
- [ ] Implement PHP requirement check.
    - [ ] Read `composer.json` from the monitor directory to determine the required PHP version.

## Frontend (React)
- [ ] Create `SetupWizard` component (Modal or inline section).
    - [ ] Listen for `setup-progress` events to show a progress bar and status text.
    - [ ] Call `updateConfig` on success.
- [ ] Add "Update Available" notification/button to `SettingsView` or `Home`.
- [ ] Implement compatibility check using Semantic Versioning (SemVer):
    - [ ] **Major version**: Incompatible API changes (e.g., NDJSON protocol changes).
    - [ ] **Minor version**: New functionality in a backwards compatible manner.
    - [ ] **Patch version**: Backwards compatible bug fixes.
    - [ ] Launcher defines a required version range (e.g., `^0.1.0`).
    - [ ] On monitor startup, validate the version from `MONITOR_STARTED` against this range.
    - [ ] Before suggesting an update from GitHub, verify the new version satisfies the launcher's requirement.
- [ ] Add "Setup Wizard" button to `SettingsView` under "Environment & Tools".
- [ ] Update `src/locales/*.json` with new strings for the setup and update process.

## Documentation
- [ ] Update `Docs/Agents/ProjectManifest/public-api.md` with the new Rust command.
- [ ] Update `Docs/Agents/ProjectManifest/tech-stack.md` with new dependencies.
