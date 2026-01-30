import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { exists } from '@tauri-apps/plugin-fs';
import { useConfig, getToolPaths } from './ConfigContext';
import { logger } from '../services/logger';

interface ValidationResult {
  isValid: boolean;
  errors: {
    phpPath?: boolean;
    gameFolderPath?: boolean;
    savegameFolderPath?: boolean;
    installPath?: boolean;
    parserToolPath?: boolean;
    viewerToolPath?: boolean;
  };
}

interface ValidationContextType {
  validation: ValidationResult;
  isValidating: boolean;
  validateNow: () => Promise<void>;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const ValidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useConfig();
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: {},
  });
  const [isValidating, setIsValidating] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const validate = useCallback(async () => {
    setIsValidating(true);
    const errors: ValidationResult['errors'] = {};
    let isValid = true;

    try {
      // 1. Validate PHP Path
      if (config.phpPath) {
        const phpExists = await exists(config.phpPath);
        if (!phpExists && config.phpPath !== 'php') {
          errors.phpPath = true;
          isValid = false;
        }
      } else {
        errors.phpPath = true;
        isValid = false;
      }

      // 2. Validate Folders
      if (config.gameFolderPath) {
        const gameExists = await exists(config.gameFolderPath);
        if (!gameExists) {
          errors.gameFolderPath = true;
          isValid = false;
        }
      } else {
        errors.gameFolderPath = true;
        isValid = false;
      }

      if (config.savegameFolderPath) {
        const saveExists = await exists(config.savegameFolderPath);
        if (!saveExists) {
          errors.savegameFolderPath = true;
          isValid = false;
        }
      } else {
        errors.savegameFolderPath = true;
        isValid = false;
      }

      // 3. Validate Installation Path and derived scripts
      if (config.installPath) {
        const installExists = await exists(config.installPath);
        if (!installExists) {
          errors.installPath = true;
          isValid = false;
        } else {
          const { parser, viewer } = getToolPaths(config.installPath);
          const parserExists = await exists(parser);
          const viewerExists = await exists(viewer);

          if (!parserExists) {
            errors.parserToolPath = true;
            isValid = false;
          }
          if (!viewerExists) {
            errors.viewerToolPath = true;
            isValid = false;
          }
        }
      } else {
        errors.installPath = true;
        isValid = false;
      }

    } catch (error) {
      logger.log('error', 'Critical validation error', error);
    } finally {
      setValidation({ isValid, errors });
      setIsValidating(false);
    }
  }, [config]);

  // Periodic validation
  useEffect(() => {
    validate(); // Initial validation
    
    intervalRef.current = window.setInterval(() => {
      validate();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [validate]);

  return (
    <ValidationContext.Provider value={{ validation, isValidating, validateNow: validate }}>
      {children}
    </ValidationContext.Provider>
  );
};

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};
