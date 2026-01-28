import React, { createContext, useContext, useState } from 'react';
import { logger } from '../services/logger';

interface ErrorDialog {
  title: string;
  message: string;
  details?: string;
}

interface ErrorContextType {
  showError: (title: string, message: string, details?: string) => void;
  clearError: () => void;
  currentError: ErrorDialog | null;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentError, setCurrentError] = useState<ErrorDialog | null>(null);

  const showError = (title: string, message: string, details?: string) => {
    logger.log('error', `Error Dialog: ${title} - ${message}`, details);
    setCurrentError({ title, message, details });
  };

  const clearError = () => setCurrentError(null);

  return (
    <ErrorContext.Provider value={{ showError, clearError, currentError }}>
      {children}
      {currentError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-500 mb-2">{currentError.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{currentError.message}</p>
            {currentError.details && (
              <pre className="bg-gray-100 dark:bg-gray-950 p-3 rounded-lg text-xs font-mono mb-4 overflow-x-auto border border-gray-200 dark:border-gray-800">
                {currentError.details}
              </pre>
            )}
            <div className="flex justify-end">
              <button
                onClick={clearError}
                className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
