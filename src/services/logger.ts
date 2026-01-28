import { invoke } from "@tauri-apps/api/core";

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private static instance: Logger;
  private sessionLog: string[] = [];

  private constructor() {
    this.log('info', 'Logger initialized for new session');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public async log(level: LogLevel, message: string, details?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = details ? `${message} | ${JSON.stringify(details)}` : message;
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${formattedMessage}`;
    
    // In-memory session log (for the UI if needed)
    this.sessionLog.push(logEntry);
    
    // Console output
    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](logEntry);

    // Call Rust to log to file
    try {
      await invoke('log_to_file', { level, message: formattedMessage });
    } catch (e) {
      console.error('Failed to write to log file', e);
    }
  }

  public getSessionLog(): string {
    return this.sessionLog.join('\n');
  }

  public async clearLog() {
    this.sessionLog = [];
    try {
      await invoke('clear_log_file');
    } catch (e) {
      console.error('Failed to clear log file', e);
    }
  }
}

export const logger = Logger.getInstance();
