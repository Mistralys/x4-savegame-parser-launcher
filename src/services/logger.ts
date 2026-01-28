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
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}${details ? ' | ' + JSON.stringify(details) : ''}`;
    
    // In-memory session log
    this.sessionLog.push(logEntry);
    
    // Console output
    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](logEntry);

    // TODO: Write to actual debug file via Rust command in WP 3
    // For now, we'll keep it in memory and can expose it via a frontend command
  }

  public getSessionLog(): string {
    return this.sessionLog.join('\n');
  }
}

export const logger = Logger.getInstance();
