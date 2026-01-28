import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { exists } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';
import { useConfig } from './ConfigContext';
import { logger } from '../services/logger';

interface ValidationResult {
  isValid: boolean;
  errors: {
    phpPath?: boolean;
    gameFolderPath?: boolean;
    savegameFolderPath?: boolean;
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
      // We try to run `php -v` to see if it's working
      try {
        const cmd = Command.create(config.phpPath, ['-v']);
        const output = await cmd.execute();
        if (output.code !== 0) {
          errors.phpPath = true;
          isValid = false;
        }
      } catch (e) {
        errors.phpPath = true;
        isValid = false;
        logger.log('warn', `PHP validation failed for path: ${config.phpPath}`, e);
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

      // 3. Validate Scripts
      if (config.parserToolPath) {
        const parserExists = await exists(config.parserToolPath);
        if (!parserExists) {
          errors.parserToolPath = true;
          isValid = false;
        }
      } else {
        errors.parserToolPath = true;
        isValid = false;
      }

      if (config.viewerToolPath) {
        const viewerExists = await exists(config.viewerToolPath);
        if (!viewerExists) {
          errors.viewerToolPath = true;
          isValid = false;
        }
      } else {
        errors.viewerToolPath = true;
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
