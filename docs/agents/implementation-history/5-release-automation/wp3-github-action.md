# Work Package 3: GitHub Actions Release Workflow

## Goals
Implement the automated CI/CD pipeline that builds, tests, and releases the application for Windows, macOS, and Linux using the official `tauri-apps/tauri-action`.

## Tasks
- [ ] **Workflow Creation**:
    - [ ] Create `.github/workflows/release.yml`.
    - [ ] Set trigger to `push: tags: ['v*']`.
    - [ ] Configure `permissions: contents: write` for the `GITHUB_TOKEN`.
- [ ] **Pre-build Job**:
    - [ ] Checkout code.
    - [ ] Extract version and changelist from `changelog.md`.
    - [ ] Generate the "Compare" link using current and previous version tags.
    - [ ] Update `package.json` and `src-tauri/tauri.conf.json` with the extracted version.
    - [ ] Commit and push changes back to `main`.
- [ ] **Build Job (Matrix)**:
    - [ ] Matrix OS: `windows-latest`, `macos-latest`, `ubuntu-22.04`.
    - [ ] Install Linux dependencies (`libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`).
    - [ ] Setup Node.js & Rust toolchain.
    - [ ] Run `npm test` (WP1) and `cargo test` (WP1).
    - [ ] Use `tauri-apps/tauri-action@v2` to build and upload artifacts.
- [ ] **Release Generation**:
    - [ ] Ensure the release body follows the requested format:
        ```markdown
        Included in this release:

        {CHANGELIST}

        ----
        [Compare v{CURRENT}-v{PREVIOUS}](https://github.com/.../compare/v{PREVIOUS}...v{CURRENT})
        ```

## Technical Details
- **Unsigned Builds**: Binaries will be built without code signing for now.
- **Artifacts**: MSI/Setup.exe (Windows), .app/.dmg (macOS), .deb/AppImage (Linux).
