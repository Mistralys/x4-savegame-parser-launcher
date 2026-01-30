import React from 'react';
import { useI18n } from '../context/I18nContext';
import { Lock } from 'lucide-react';

interface BlockingModalProps {
  isVisible: boolean;
}

export const BlockingModal: React.FC<BlockingModalProps> = ({ isVisible }) => {
  const { t } = useI18n();
  
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/60 dark:bg-gray-950/60 backdrop-blur-[2px] rounded-3xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
          <Lock className="text-red-500" size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t('errors.invalid_config')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {t('errors.modal_message')}
        </p>
      </div>
    </div>
  );
};
