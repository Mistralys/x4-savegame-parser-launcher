use std::io::Write;
use std::path::{Path, PathBuf};
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter, Manager};

// ─── Constants ────────────────────────────────────────────────────────────────

/// Pinned PHP 8.4 NTS x64 Windows download URL.
/// Update this constant when shipping a new supported PHP version.
/// Releases index: <https://windows.php.net/download/>
const DEFAULT_PHP_DOWNLOAD_URL: &str =
    "https://windows.php.net/downloads/releases/php-8.4.8-nts-Win32-vs17-x64.zip";

/// Default monitor asset filename used when building the GitHub release download URL.
const DEFAULT_MONITOR_ASSET_NAME: &str = "x4-savegame-parser.zip";

const MONITOR_REPO: &str = "Mistralys/x4-savegame-parser";
const GITHUB_API_BASE: &str = "https://api.github.com";
const GITHUB_RELEASES_BASE: &str = "https://github.com";

// ─── Public structs ───────────────────────────────────────────────────────────

/// Optional configuration overrides for the installation wizard.
/// When a field is `None`, the compiled-in default is used.
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SetupConfig {
    /// Override the PHP NTS x64 Windows download URL.
    pub php_download_url: Option<String>,
    /// Override the monitor release asset filename (e.g. `x4-savegame-parser.zip`).
    pub monitor_asset_name: Option<String>,
}

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

// ─── Private helpers ──────────────────────────────────────────────────────────

/// Returns the current OS name and CPU architecture.
fn detect_os_arch() -> (String, String) {
    (
        std::env::consts::OS.to_string(),
        std::env::consts::ARCH.to_string(),
    )
}

/// Fetches the latest release tag from the monitor's GitHub repository.
async fn fetch_latest_release(client: &reqwest::Client) -> Result<String, String> {
    let url = format!("{}/repos/{}/releases/latest", GITHUB_API_BASE, MONITOR_REPO);

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release info: {}", e))?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release info: {}", e))?;

    json.get("tag_name")
        .and_then(|t| t.as_str())
        .ok_or_else(|| "Release tag not found in GitHub API response".to_string())
        .map(|s| s.to_string())
}

/// Downloads a file from `url` to `dest`, using streaming to avoid loading the
/// entire response into memory. Overwrites any existing file at `dest`.
async fn download_file(client: &reqwest::Client, url: &str, dest: &Path) -> Result<(), String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with HTTP {}: {}",
            response.status(),
            url
        ));
    }

    let mut file = std::fs::File::create(dest)
        .map_err(|e| format!("Failed to create destination file: {}", e))?;

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error reading download stream: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write downloaded data: {}", e))?;
    }

    Ok(())
}

/// Extracts all entries from `zip_path` into `dest_dir`, overwriting existing
/// files. Uses `enclosed_name()` to prevent path traversal (zip-slip).
fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), String> {
    let file = std::fs::File::open(zip_path)
        .map_err(|e| format!("Failed to open zip archive: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry {}: {}", i, e))?;

        // Reject entries whose names escape the destination directory.
        let outpath = match entry.enclosed_name() {
            Some(path) => dest_dir.join(path),
            None => continue,
        };

        if entry.is_dir() {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory {:?}: {}", outpath, e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            let mut out_file = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file {:?}: {}", outpath, e))?;
            std::io::copy(&mut entry, &mut out_file)
                .map_err(|e| format!("Failed to extract {:?}: {}", outpath, e))?;
        }
    }

    Ok(())
}

/// Recursively searches `extract_root` for `php.exe` and returns its path.
fn resolve_php_binary(extract_root: &Path) -> Result<PathBuf, String> {
    fn find_php(dir: &Path) -> Option<PathBuf> {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file()
                    && path
                        .file_name()
                        .map(|n| n == "php.exe")
                        .unwrap_or(false)
                {
                    return Some(path);
                }
                if path.is_dir() {
                    if let Some(found) = find_php(&path) {
                        return Some(found);
                    }
                }
            }
        }
        None
    }

    find_php(extract_root)
        .ok_or_else(|| "php.exe not found after extraction".to_string())
}

// ─── Public entry points ──────────────────────────────────────────────────────

/// Downloads PHP NTS x64 and the latest savegame monitor release, extracts
/// them under `<app_data_dir>/tools/`, and returns the resulting paths.
///
/// Emits `setup-progress` events at each named stage so the frontend can
/// display a progress bar.  Returns a descriptive error on non-Windows
/// platforms without panicking.
pub async fn download_and_install_tools(app: AppHandle, config: Option<SetupConfig>) -> Result<InstalledPaths, String> {
    let cfg = config.unwrap_or_default();
    let php_url = cfg.php_download_url
        .unwrap_or_else(|| DEFAULT_PHP_DOWNLOAD_URL.to_string());
    let asset_name = cfg.monitor_asset_name
        .unwrap_or_else(|| DEFAULT_MONITOR_ASSET_NAME.to_string());

    if std::env::consts::OS != "windows" {
        return Err(
            "Automatic PHP installation is only supported on Windows. \
             Please install PHP manually."
                .to_string(),
        );
    }

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let install_dir = app_data_dir.join("tools");
    std::fs::create_dir_all(&install_dir)
        .map_err(|e| format!("Failed to create installation directory: {}", e))?;

    // Stage: detecting
    let (os, arch) = detect_os_arch();
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "detecting".to_string(),
            message: format!("Detected: {} {}", os, arch),
            percent: 5,
        },
    );

    let client = reqwest::Client::builder()
        .user_agent("x4-savegame-parser-launcher/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Stage: fetching_release
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "fetching_release".to_string(),
            message: "Fetching latest release info...".to_string(),
            percent: 10,
        },
    );
    let tag = fetch_latest_release(&client).await?;
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "fetching_release".to_string(),
            message: format!("Latest release: {}", tag),
            percent: 20,
        },
    );

    // Stage: downloading_monitor
    let monitor_url = format!(
        "{}/{}/releases/download/{}/{}",
        GITHUB_RELEASES_BASE, MONITOR_REPO, tag, asset_name
    );
    let monitor_zip_path = install_dir.join("monitor.zip");
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "downloading_monitor".to_string(),
            message: "Downloading Savegame Monitor...".to_string(),
            percent: 25,
        },
    );
    download_file(&client, &monitor_url, &monitor_zip_path).await?;
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "downloading_monitor".to_string(),
            message: "Monitor download complete.".to_string(),
            percent: 45,
        },
    );

    // Stage: downloading_php
    let php_zip_path = install_dir.join("php.zip");
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "downloading_php".to_string(),
            message: "Downloading PHP...".to_string(),
            percent: 50,
        },
    );
    download_file(&client, &php_url, &php_zip_path).await?;
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "downloading_php".to_string(),
            message: "PHP download complete.".to_string(),
            percent: 65,
        },
    );

    // Stage: extracting
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "extracting".to_string(),
            message: "Extracting files...".to_string(),
            percent: 70,
        },
    );
    let monitor_extract_dir = install_dir.join("parser");
    std::fs::create_dir_all(&monitor_extract_dir)
        .map_err(|e| format!("Failed to create parser directory: {}", e))?;
    extract_zip(&monitor_zip_path, &monitor_extract_dir)?;

    let php_extract_dir = install_dir.join("php");
    std::fs::create_dir_all(&php_extract_dir)
        .map_err(|e| format!("Failed to create PHP directory: {}", e))?;
    extract_zip(&php_zip_path, &php_extract_dir)?;

    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "extracting".to_string(),
            message: "Extraction complete.".to_string(),
            percent: 85,
        },
    );

    // Resolve PHP binary
    let php_path = resolve_php_binary(&php_extract_dir)?;

    // Stage: complete
    let _ = app.emit(
        "setup-progress",
        SetupProgress {
            step: "complete".to_string(),
            message: "Setup complete!".to_string(),
            percent: 100,
        },
    );

    Ok(InstalledPaths {
        php_path: php_path.to_string_lossy().to_string(),
        install_path: monitor_extract_dir.to_string_lossy().to_string(),
    })
}

/// Fetches the latest release tag from GitHub and compares it against
/// `current_version` (both stripped of a leading `v` prefix) using string
/// equality.  Returns `update_available: true` when the tags differ.
pub async fn check_for_updates(current_version: Option<String>) -> Result<UpdateInfo, String> {
    let client = reqwest::Client::builder()
        .user_agent("x4-savegame-parser-launcher/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let tag = fetch_latest_release(&client).await?;
    let latest_version = tag.trim_start_matches('v').to_string();

    let current = current_version
        .as_deref()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let update_available = !latest_version.is_empty() && latest_version != current;

    Ok(UpdateInfo {
        current_version,
        latest_version,
        update_available,
    })
}
