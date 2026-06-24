import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { useI18n } from '../context/I18nContext';
import { Download, CheckCircle2, AlertCircle, RefreshCw, X, Loader2, GitMerge } from 'lucide-react';
import type { SetupProgress, InstalledPaths, UpdateInfo } from '../types/shared';

// Re-export for consumers that currently import from this module.
export type { SetupProgress, InstalledPaths } from '../types/shared';

export interface SetupWizardProps {
  onComplete: (paths: InstalledPaths) => void;
  onClose: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onClose }) => {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<SetupProgress | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = React.useState(false);
  const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo | null>(null);

  const startInstallation = React.useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setProgress(null);

    let unlisten: UnlistenFn | null = null;

    try {
      unlisten = await listen<SetupProgress>('setup-progress', (event) => {
        setProgress(event.payload);
      });

      const paths = await invoke<InstalledPaths>('download_and_install_tools');
      onComplete(paths);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
      if (unlisten) unlisten();
    }
  }, [onComplete]);

  const checkForUpdates = React.useCallback(async () => {
    setIsCheckingUpdates(true);
    setUpdateInfo(null);
    try {
      const info = await invoke<UpdateInfo>('check_for_updates', { current_version: null });
      setUpdateInfo(info);
    } catch (e) {
      setUpdateInfo(null);
    } finally {
      setIsCheckingUpdates(false);
    }
  }, []);

  React.useEffect(() => {
    startInstallation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/60 dark:bg-gray-950/60 backdrop-blur-[2px] rounded-3xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Download className="text-blue-500" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t('setup.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('setup.subtitle')}
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              aria-label={t('setup.cancel')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          )}
        </div>

        {/* Running state: spinner + progress bar */}
        {isRunning && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {progress ? progress.message : t('setup.starting')}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-right text-gray-400 dark:text-gray-500">
              {progress?.percent ?? 0}%
            </p>
          </div>
        )}

        {/* Initializing (before first progress event) */}
        {!isRunning && !error && !progress && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
            {t('setup.initializing')}
          </div>
        )}

        {/* Success state (briefly shown before parent closes modal) */}
        {!isRunning && !error && progress !== null && progress.percent === 100 && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <p className="text-sm font-bold text-green-600 dark:text-green-400">
              {t('setup.success')}
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !isRunning && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {t('setup.error_title')}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 break-all">
                  {error}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={startInstallation}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all"
              >
                <RefreshCw size={16} />
                {t('setup.retry')}
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-sm font-bold transition-all"
              >
                {t('setup.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Check for Updates section (shown when not actively installing) */}
        {!isRunning && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            <button
              onClick={checkForUpdates}
              disabled={isCheckingUpdates}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingUpdates ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GitMerge size={16} />
              )}
              {t('setup.update_check')}
            </button>
            {updateInfo && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${
                  updateInfo.update_available
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                }`}
              >
                {updateInfo.update_available ? (
                  <>
                    <AlertCircle size={16} className="shrink-0" />
                    {t('setup.update_available').replace('{version}', updateInfo.latest_version)}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="shrink-0" />
                    {t('setup.up_to_date').replace('{version}', updateInfo.latest_version)}
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
