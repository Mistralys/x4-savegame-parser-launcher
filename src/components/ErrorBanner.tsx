import React from 'react';
import { useValidation } from '../context/ValidationContext';
import { useI18n } from '../context/I18nContext';
import { AlertTriangle } from 'lucide-react';

export const ErrorBanner: React.FC = () => {
  const { validation } = useValidation();
  const { t } = useI18n();

  if (validation.isValid) return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 animate-in slide-in-from-top duration-300">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <AlertTriangle className="text-red-500 shrink-0" size={18} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            {t('errors.invalid_config')}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80 truncate">
            {t('errors.fix_settings')}
          </p>
        </div>
      </div>
    </div>
  );
};
