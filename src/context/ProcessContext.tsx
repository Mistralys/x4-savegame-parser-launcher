import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useConfig } from './ConfigContext';
import { logger } from '../services/logger';

export type ToolStatus = 'running' | 'stopped' | 'starting' | 'stopping';

interface ProcessOutput {
  tool: string;
  message: string;
  stream: 'stdout' | 'stderr';
}

interface ToolState {
  status: ToolStatus;
  logs: string[];
}

interface ProcessContextType {
  tools: Record<string, ToolState>;
  startTool: (tool: string) => Promise<void>;
  stopTool: (tool: string) => Promise<void>;
  clearLogs: (tool: string) => void;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useConfig();
  const [tools, setTools] = useState<Record<string, ToolState>>({
    parser: { status: 'stopped', logs: [] },
    viewer: { status: 'stopped', logs: [] },
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
        
        // Keep only last 1000 lines for performance
        const newLogs = [...toolState.logs, message].slice(-1000);
        return {
          ...prev,
          [tool]: { ...toolState, logs: newLogs }
        };
      });
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const startTool = useCallback(async (tool: string) => {
    setTools(prev => ({ ...prev, [tool]: { ...prev[tool], status: 'starting' } }));
    
    try {
      const phpPath = config.phpPath;
      const scriptPath = tool === 'parser' ? config.parserToolPath : config.viewerToolPath;
      
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

  return (
    <ProcessContext.Provider value={{ tools, startTool, stopTool, clearLogs }}>
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
