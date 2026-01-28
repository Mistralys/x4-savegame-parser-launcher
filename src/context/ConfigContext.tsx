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
  storageFolder: string;
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
  storageFolder: 'archived-saves',
  autoBackupEnabled: true,
  keepXMLFiles: false,
  loggingEnabled: false,
};

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  loadFromToolConfig: () => Promise<void>;
  isLoading: boolean;
  hasToolConfigError: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const store = new LazyStore('settings.json');

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToolConfigError, setHasToolConfigError] = useState(false);
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

  const saveToToolConfig = useCallback(async (currentConfig: AppConfig) => {
    if (!currentConfig.installPath) return;

    const toolConfig = {
      gameFolder: currentConfig.gameFolderPath,
      storageFolder: currentConfig.storageFolder,
      viewerHost: currentConfig.viewerHost,
      viewerPort: currentConfig.viewerPort,
      autoBackupEnabled: currentConfig.autoBackupEnabled,
      keepXMLFiles: currentConfig.keepXMLFiles,
      loggingEnabled: currentConfig.loggingEnabled,
    };

    try {
      await invoke('save_tool_config', {
        config: toolConfig,
        installPath: currentConfig.installPath,
      });
      setHasToolConfigError(false);
    } catch (error) {
      console.error('Failed to save tool config', error);
      setHasToolConfigError(true);
      // We don't throw here to avoid blocking the main UI settings save
    }
  }, []);

  const loadFromToolConfig = async () => {
    if (!config.installPath) return;

    try {
      const toolConfig = await invoke<any>('load_tool_config', {
        installPath: config.installPath,
      });

      await updateConfig({
        gameFolderPath: toolConfig.gameFolder,
        storageFolder: toolConfig.storageFolder,
        viewerHost: toolConfig.viewerHost,
        viewerPort: toolConfig.viewerPort,
        autoBackupEnabled: toolConfig.autoBackupEnabled,
        keepXMLFiles: toolConfig.keepXMLFiles,
        loggingEnabled: toolConfig.loggingEnabled,
      });
    } catch (error) {
      console.error('Failed to load tool config', error);
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

      // Check if any tool-relevant settings changed
      const toolFields: (keyof AppConfig)[] = [
        'gameFolderPath',
        'storageFolder',
        'viewerHost',
        'viewerPort',
        'autoBackupEnabled',
        'keepXMLFiles',
        'loggingEnabled',
        'installPath'
      ];

      const hasToolChanges = Object.keys(newConfig).some(key =>
        toolFields.includes(key as keyof AppConfig)
      );

      if (hasToolChanges) {
        await saveToToolConfig(updated);
      }
    } catch (error) {
      console.error('Failed to save config', error);
    }
  };

  return (
    <ConfigContext.Provider value={{
      config,
      updateConfig,
      loadFromToolConfig,
      isLoading,
      hasToolConfigError
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
