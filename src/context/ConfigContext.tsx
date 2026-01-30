import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LazyStore } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';
import { useI18n, getSystemLanguage, Language } from './I18nContext';

export interface AppConfig {
  phpPath: string;
  gameFolderPath: string;
  savegameFolderPath: string;
  installPath: string;
  viewerHost: string;
  viewerPort: number;
  language: Language | 'auto';
  // Tool-specific config
  autoBackupEnabled: boolean;
  keepXMLFiles: boolean;
  loggingEnabled: boolean;
}

const DEFAULT_VIEWER_HOST = 'localhost';
const DEFAULT_VIEWER_PORT = 9494;

const DEFAULT_CONFIG: AppConfig = {
  phpPath: 'php',
  gameFolderPath: '',
  savegameFolderPath: '',
  installPath: '',
  viewerHost: DEFAULT_VIEWER_HOST,
  viewerPort: DEFAULT_VIEWER_PORT,
  language: 'auto',
  autoBackupEnabled: true,
  keepXMLFiles: false,
  loggingEnabled: false,
};

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  loadFromToolConfig: () => Promise<void>;
  saveToToolConfig: () => Promise<void>;
  checkToolConfigExists: () => Promise<boolean>;
  isLoading: boolean;
  hasToolConfigError: boolean;
  toolConfigErrorMessage: string | null;
  toolConfigExists: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const store = new LazyStore('settings.json');

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToolConfigError, setHasToolConfigError] = useState(false);
  const [toolConfigErrorMessage, setToolConfigErrorMessage] = useState<string | null>(null);
  const [toolConfigExists, setToolConfigExists] = useState(false);
  const { setLanguage } = useI18n();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const saved = await store.get<any>('config');
        
        // Migration: Split viewerUrl into host and port if needed
        if (saved && saved.viewerUrl && !saved.viewerHost) {
          try {
            const url = new URL(saved.viewerUrl);
            saved.viewerHost = url.hostname;
            saved.viewerPort = parseInt(url.port) || DEFAULT_VIEWER_PORT;
          } catch (e) {
            // Fallback for simple "host:port" strings
            const parts = saved.viewerUrl.replace('http://', '').replace('https://', '').split(':');
            saved.viewerHost = parts[0] || DEFAULT_VIEWER_HOST;
            saved.viewerPort = parseInt(parts[1]) || DEFAULT_VIEWER_PORT;
          }
        }

        const mergedConfig = { ...DEFAULT_CONFIG, ...saved };
        
        let targetLang: Language;
        if (mergedConfig.language === 'auto') {
          targetLang = await getSystemLanguage();
        } else {
          targetLang = mergedConfig.language;
        }
        
        setConfig(mergedConfig);
        setLanguage(targetLang);
      } catch (error) {
        console.error('Failed to load config', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [setLanguage]);

  const checkToolConfigExists = useCallback(async () => {
    if (!config.installPath) {
      setToolConfigExists(false);
      return false;
    }
    try {
      const normalizedPath = config.installPath.replace(/\\/g, '/').replace(/\/$/, '');
      const exists = await invoke<boolean>('check_tool_config_exists', {
        installPath: normalizedPath,
      });
      setToolConfigExists(exists);
      return exists;
    } catch (error) {
      console.error('Failed to check tool config existence', error);
      setToolConfigExists(false);
      return false;
    }
  }, [config.installPath]);

  useEffect(() => {
    checkToolConfigExists();
  }, [config.installPath, checkToolConfigExists]);

  const saveToToolConfig = async () => {
    if (!config.installPath) return;

    const normalizedPath = config.installPath.replace(/\\/g, '/').replace(/\/$/, '');
    const toolConfig = {
      gameFolder: config.gameFolderPath,
      savesFolder: config.savegameFolderPath,
      viewerHost: config.viewerHost,
      viewerPort: config.viewerPort,
      autoBackupEnabled: config.autoBackupEnabled,
      keepXmlFiles: config.keepXMLFiles,
      loggingEnabled: config.loggingEnabled,
    };

    try {
      await invoke('save_tool_config', {
        config: toolConfig,
        installPath: normalizedPath,
      });
      setHasToolConfigError(false);
      setToolConfigErrorMessage(null);
      await checkToolConfigExists();
    } catch (error) {
      console.error('Failed to save tool config', error);
      setHasToolConfigError(true);
      setToolConfigErrorMessage(String(error));
      throw error;
    }
  };

  const loadFromToolConfig = async () => {
    if (!config.installPath) return;

    try {
      const normalizedPath = config.installPath.replace(/\\/g, '/').replace(/\/$/, '');
      const toolConfig = await invoke<any>('load_tool_config', {
        installPath: normalizedPath,
      });

      await updateConfig({
        gameFolderPath: toolConfig.gameFolder,
        savegameFolderPath: toolConfig.savesFolder,
        viewerHost: toolConfig.viewerHost,
        viewerPort: toolConfig.viewerPort,
        autoBackupEnabled: toolConfig.autoBackupEnabled,
        keepXMLFiles: toolConfig.keepXmlFiles,
        loggingEnabled: toolConfig.loggingEnabled,
      });
      setHasToolConfigError(false);
      setToolConfigErrorMessage(null);
    } catch (error) {
      console.error('Failed to load tool config', error);
      setHasToolConfigError(true);
      setToolConfigErrorMessage(String(error));
      throw error;
    }
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    
    if (newConfig.language) {
      if (newConfig.language === 'auto') {
        setLanguage(await getSystemLanguage());
      } else {
        setLanguage(newConfig.language);
      }
    }

    try {
      await store.set('config', updated);
      await store.save();
    } catch (error) {
      console.error('Failed to save config', error);
    }
  };

  return (
    <ConfigContext.Provider value={{
      config,
      updateConfig,
      loadFromToolConfig,
      saveToToolConfig,
      checkToolConfigExists,
      isLoading,
      hasToolConfigError,
      toolConfigErrorMessage,
      toolConfigExists
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const getToolPaths = (installPath: string) => {
  const normalizedPath = installPath.replace(/\\/g, '/').replace(/\/$/, '');
  return {
    viewer: normalizedPath ? `${normalizedPath}/bin/php/run-ui.php` : '',
    parser: normalizedPath ? `${normalizedPath}/bin/php/run-monitor.php` : '',
  };
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
