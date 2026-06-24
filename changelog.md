# Changelog

## v2.1.0 - Pending Features Completion

### New Features
- **Auto-Setup Wizard** (`SetupWizard.tsx`): One-click download and installation of PHP NTS and the Savegame Monitor. Triggered automatically from the Settings view when `phpPath` or `installPath` is unset. Displays real-time progress, error recovery with retry, and an optional update check panel.
- **Dynamic Logbook Category Filter**: The Logbook view now populates its category dropdown from the `log-metadata` PHP command, replacing the previous hardcoded list.
- **PHP `log-metadata` command** (`x4-savegame-parser`): New CLI command returning `{ categories: string[] }` from the logbook analysis cache — used by the Launcher to build the dynamic filter dropdown.
- **Tauri Setup Commands** (`setup.rs`): `download_and_install_tools` (streaming installation with `setup-progress` events) and `check_for_updates` (GitHub release comparison) added to the Tauri backend.

### Bug Fixes
- `SetupWizard.tsx`: Update check failure no longer shows a misleading empty-version badge; `updateInfo` is now set to `null` on catch.

## v2.0.0 - Full GUI Release
- Upgraded the tool to be the main GUI for the savegame parser and viewer.
- Added savegame browsing and viewing.

## v1.0.0 - Initial Release
- Initial release with monitor and viewer launching.
