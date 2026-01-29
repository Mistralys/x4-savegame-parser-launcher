# Work Package 2: Project Preparation & Versioning

## Goals
Prepare the project structure and establish `changelog.md` as the authoritative source for version information.

## Tasks
- [ ] **File Cleanup**:
    - [ ] Rename `changelog,md` to `changelog.md`.
- [ ] **Versioning Logic**:
    - [ ] Validate the format of the latest entry in `changelog.md` matches `## v{VERSION} - {TITLE}`.
    - [ ] Ensure `package.json` and `src-tauri/tauri.conf.json` are in sync with the current version (0.1.0).
- [ ] **CI/CD Integration Logic**:
    - [ ] Prepare scripts to extract the version, title, and changelist from `changelog.md`.
    - [ ] Prepare scripts to calculate the previous version for the "Compare" link.
