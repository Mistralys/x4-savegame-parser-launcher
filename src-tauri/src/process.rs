use std::collections::HashMap;
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};

#[derive(Clone, serde::Serialize)]
struct ProcessOutput {
    tool: String,
    message: String,
    stream: String, // "stdout" or "stderr"
}

pub struct ProcessManager {
    // Maps tool name (e.g., "parser", "viewer") to its child process
    children: Arc<Mutex<HashMap<String, Child>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            children: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start_tool<R: Runtime>(
        &self,
        app: AppHandle<R>,
        tool_name: String,
        php_path: String,
        script_path: String,
    ) -> Result<(), String> {
        let mut children = self.children.lock().unwrap();

        // Kill existing process if it's already running for this tool
        if let Some(mut child) = children.remove(&tool_name) {
            let _ = child.kill();
        }

        let mut command = Command::new(php_path);
        command
            .arg(script_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            // On Windows, prevent terminal window from popping up
            .creation_flags(0x08000000); // CREATE_NO_WINDOW

        let mut child = command.spawn().map_err(|e| e.to_string())?;

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let tool_name_clone = tool_name.clone();
        let app_clone = app.clone();

        // Spawn thread to handle stdout
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    "process-output",
                    ProcessOutput {
                        tool: tool_name_clone.clone(),
                        message: line,
                        stream: "stdout".to_string(),
                    },
                );
            }
        });

        let tool_name_clone = tool_name.clone();
        let app_clone = app.clone();

        // Spawn thread to handle stderr
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_clone.emit(
                    "process-output",
                    ProcessOutput {
                        tool: tool_name_clone.clone(),
                        message: line,
                        stream: "stderr".to_string(),
                    },
                );
            }
        });

        children.insert(tool_name, child);
        Ok(())
    }

    pub fn stop_tool(&self, tool_name: &str) -> Result<(), String> {
        let mut children = self.children.lock().unwrap();
        if let Some(mut child) = children.remove(tool_name) {
            let _ = child.start_kill();
        }
        Ok(())
    }

    pub fn is_running(&self, tool_name: &str) -> bool {
        let mut children = self.children.lock().unwrap();
        if let Some(child) = children.get_mut(tool_name) {
            // try_wait() returns Ok(None) if still running
            match child.try_wait() {
                Ok(None) => true,
                _ => {
                    children.remove(tool_name);
                    false
                }
            }
        } else {
            false
        }
    }

    pub fn stop_all(&self) {
        let mut children = self.children.lock().unwrap();
        for (_, mut child) in children.drain() {
            let _ = child.start_kill();
        }
    }
}
