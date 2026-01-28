import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { locale } from '@tauri-apps/api/os'; // Commenting out until we resolve the import issue

export type Language = 'en' | 'fr' | 'de';

interface TranslationSchema {
  [key: string]: string | TranslationSchema;
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  availableLanguages: { code: Language; name: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'de'];

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<TranslationSchema>({});
  const [availableLanguages, setAvailableLanguages] = useState<{ code: Language; name: string }[]>([]);

  const loadTranslations = useCallback(async (lang: Language) => {
    try {
      const module = await import(`../locales/${lang}.json`);
      return module.default;
    } catch (error) {
      console.error(`Failed to load translations for ${lang}`, error);
      return null;
    }
  }, []);

  // Initialize available languages list
  useEffect(() => {
    const initLanguages = async () => {
      const langs: { code: Language; name: string }[] = [];
      for (const code of SUPPORTED_LANGUAGES) {
        const trans = await loadTranslations(code);
        if (trans && trans.language_name) {
          langs.push({ code, name: trans.language_name as string });
        }
      }
      setAvailableLanguages(langs);
      
      // Load current language translations
      const currentTrans = await loadTranslations(language);
      if (currentTrans) setTranslations(currentTrans);
    };
    initLanguages();
  }, [loadTranslations, language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return path;
      }
    }

    return typeof result === 'string' ? result : path;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const getSystemLanguage = async (): Promise<Language> => {
  try {
    // const systemLocale = await locale();
    // For now, default to browser language or 'en'
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
      return browserLang as Language;
    }
  } catch (error) {
    console.error('Failed to get system locale', error);
  }
  return 'en';
};
