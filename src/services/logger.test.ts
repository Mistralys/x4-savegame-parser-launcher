import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';
import { invoke } from '@tauri-apps/api/core';

describe('Logger Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await logger.clearLog();
  });

  it('should format log entries correctly', async () => {
    const spy = vi.spyOn(console, 'info');
    await logger.log('info', 'Test message');
    
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[INFO] Test message'));
    spy.mockRestore();
  });

  it('should call tauri invoke to log to file', async () => {
    await logger.log('error', 'Critical failure');
    
    expect(invoke).toHaveBeenCalledWith('log_to_file', {
      level: 'error',
      message: 'Critical failure'
    });
  });

  it('should maintain a session log', async () => {
    await logger.log('info', 'First');
    await logger.log('info', 'Second');
    
    const session = logger.getSessionLog();
    expect(session).toContain('First');
    expect(session).toContain('Second');
  });
});
