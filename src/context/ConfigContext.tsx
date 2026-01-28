import React, { createContext, useContext, useState, useEffect } from 'react';
import { LazyStore } from '@tauri-apps/plugin-store';
import { useI18n, getSystemLanguage, Language } from './I18nContext';

export interface AppConfig {
  phpPath: string;
  gameFolderPath: string;
  savegameFolderPath: string;
  parserToolPath: string;
  viewerToolPath: string;
  viewerUrl: string;
  language: Language | 'auto';
}

const DEFAULT_CONFIG: AppConfig = {
  phpPath: 'php',
  gameFolderPath: '',
  savegameFolderPath: '',
  parserToolPath: '',
  viewerToolPath: '',
  viewerUrl: 'http://localhost:8000',
  language: 'auto',
};

interface ConfigContextType {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  isLoading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const store = new LazyStore('settings.json');

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const { setLanguage } = useI18n();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const saved = await store.get<Partial<AppConfig>>('config');
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
    <ConfigContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
