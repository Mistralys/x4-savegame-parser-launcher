import React from 'react';
import { useValidation } from '../context/ValidationContext';
import { useConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';
import { AlertTriangle } from 'lucide-react';

export const ErrorBanner: React.FC = () => {
  const { validation } = useValidation();
  const { hasToolConfigError } = useConfig();
  const { t } = useI18n();

  if (validation.isValid && !hasToolConfigError) return null;

  const title = !validation.isValid ? t('errors.invalid_config') : t('errors.title');
  const message = !validation.isValid ? t('errors.fix_settings') : t('errors.config_write_failed');

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 animate-in slide-in-from-top duration-300">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <AlertTriangle className="text-red-500 shrink-0" size={18} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            {title}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400/80 truncate">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
