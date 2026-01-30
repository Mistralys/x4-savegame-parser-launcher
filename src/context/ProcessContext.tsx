import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useConfig, getToolPaths } from './ConfigContext';
import { logger } from '../services/logger';

export type ToolStatus = 'running' | 'stopped' | 'starting' | 'stopping';

interface ProcessOutput {
  tool: string;
  message: string;
  stream: 'stdout' | 'stderr';
}

interface MonitorMessage {
  type: 'event' | 'tick' | 'log' | 'error';
  timestamp?: string;
  name?: string;
  payload?: any;
  message?: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  counter?: number;
}

interface ToolState {
  status: ToolStatus;
  logs: string[];
  events: MonitorMessage[];
  currentEvent?: string;
  lastTick?: number;
  detectedSave?: { name: string; path: string };
  version?: string;
  error?: {
    message: string;
    code?: number;
    errors?: Array<{
      message: string;
      code?: number;
      class?: string;
      details?: string;
      trace?: string;
    }>;
  };
}

interface ProcessContextType {
  tools: Record<string, ToolState>;
  startTool: (tool: string) => Promise<void>;
  stopTool: (tool: string) => Promise<void>;
  clearLogs: (tool: string) => void;
  clearEvents: (tool: string) => void;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useConfig();
  const [tools, setTools] = useState<Record<string, ToolState>>({
    parser: { status: 'stopped', logs: [], events: [] },
    viewer: { status: 'stopped', logs: [], events: [] },
  });

  // Check initial status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const parserRunning = await invoke<boolean>('is_tool_running', { tool: 'parser' });
      const viewerRunning = await invoke<boolean>('is_tool_running', { tool: 'viewer' });
      
      setTools(prev => ({
        ...prev,
        parser: { ...prev.parser, status: parserRunning ? 'running' : 'stopped' },
        viewer: { ...prev.viewer, status: viewerRunning ? 'running' : 'stopped' },
      }));
    };
    checkStatus();
  }, []);

  // Listen for process output events
  useEffect(() => {
    const unlisten = listen<ProcessOutput>('process-output', (event) => {
      const { tool, message } = event.payload;
      
      setTools(prev => {
        const toolState = prev[tool];
        if (!toolState) return prev;

        let processedMessage = message;
        let updates: Partial<ToolState> = {};

        // Try to parse NDJSON if it's the parser tool
        if (tool === 'parser' && message.startsWith('{')) {
          try {
            const parsed = JSON.parse(message) as MonitorMessage;
            
            switch (parsed.type) {
              case 'tick':
                updates.lastTick = parsed.counter;
                // Don't add ticks to log history to keep it clean
                return {
                  ...prev,
                  [tool]: { ...toolState, ...updates }
                };
              
              case 'event':
                updates.currentEvent = parsed.name;
                if (parsed.name === 'MONITOR_STARTED' && parsed.payload?.version) {
                  updates.version = parsed.payload.version;
                }
                if (parsed.name === 'SAVE_DETECTED' && parsed.payload) {
                  updates.detectedSave = parsed.payload;
                }
                processedMessage = `[EVENT] ${parsed.name}${parsed.payload ? ': ' + JSON.stringify(parsed.payload) : ''}`;
                
                // Add to events history
                updates.events = [
                  { ...parsed, timestamp: parsed.timestamp || new Date().toISOString() },
                  ...(toolState.events || [])
                ].slice(0, 50);
                break;

              case 'log':
                const levelStr = parsed.level ? `[${parsed.level.toUpperCase()}] ` : '';
                processedMessage = `${levelStr}${parsed.message}`;
                break;

              case 'error':
                processedMessage = `[ERROR] ${parsed.message}`;
                updates.error = {
                  message: parsed.message || 'Unknown error',
                  code: (parsed as any).code,
                  errors: (parsed as any).errors
                };

                // Add to events history
                updates.events = [
                  {
                    type: 'error',
                    message: parsed.message,
                    level: 'error',
                    timestamp: parsed.timestamp || new Date().toISOString()
                  } as MonitorMessage,
                  ...(toolState.events || [])
                ].slice(0, 50);
                // When a fatal error occurs, the process will exit shortly
                break;
            }
          } catch (e) {
            // Not valid JSON or failed to parse, fallback to raw message
          }
        }
        
        // Keep only last 1000 lines for performance
        const newLogs = [...toolState.logs, processedMessage].slice(-1000);
        return {
          ...prev,
          [tool]: { ...toolState, ...updates, logs: newLogs }
        };
      });
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const startTool = useCallback(async (tool: string) => {
    setTools(prev => ({ ...prev, [tool]: { ...prev[tool], status: 'starting', error: undefined } }));
    
    try {
      const phpPath = config.phpPath;
      const toolPaths = getToolPaths(config.installPath);
      const scriptPath = tool === 'parser' ? toolPaths.parser : toolPaths.viewer;
      
      await invoke('start_tool', { tool, phpPath, scriptPath });
      setTools(prev => ({ ...prev, [tool]: { ...prev[tool], status: 'running' } }));
      logger.log('info', `Started tool: ${tool}`);
    } catch (error) {
      setTools(prev => ({ ...prev, [tool]: { ...prev[tool], status: 'stopped' } }));
      logger.log('error', `Failed to start tool: ${tool}`, error);
      throw error;
    }
  }, [config]);

  const stopTool = useCallback(async (tool: string) => {
    setTools(prev => ({ ...prev, [tool]: { ...prev[tool], status: 'stopping' } }));
    
    try {
      await invoke('stop_tool', { tool });
      setTools(prev => ({ ...prev, [tool]: { ...prev[tool], status: 'stopped' } }));
      logger.log('info', `Stopped tool: ${tool}`);
    } catch (error) {
      logger.log('error', `Failed to stop tool: ${tool}`, error);
      throw error;
    }
  }, []);

  const clearLogs = useCallback((tool: string) => {
    setTools(prev => ({ ...prev, [tool]: { ...prev[tool], logs: [] } }));
  }, []);

  const clearEvents = useCallback((tool: string) => {
    setTools(prev => ({ ...prev, [tool]: { ...prev[tool], events: [] } }));
  }, []);

  return (
    <ProcessContext.Provider value={{ tools, startTool, stopTool, clearLogs, clearEvents }}>
      {children}
    </ProcessContext.Provider>
  );
};

export const useProcess = () => {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error('useProcess must be used within a ProcessProvider');
  }
  return context;
};
