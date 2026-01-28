import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useConfig, AppConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';
import { useValidation } from '../context/ValidationContext';
import { FolderOpen, FileCode, Terminal, Globe, Languages, Activity, Download } from 'lucide-react';
import { logger } from '../services/logger';

export const SettingsView: React.FC = () => {
  const { config, updateConfig } = useConfig();
  const { t, availableLanguages } = useI18n();
  const { validation } = useValidation();

  const pickFolder = async (key: keyof AppConfig) => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t(`settings.${key as string}`),
    });
    if (selected && typeof selected === 'string') {
      updateConfig({ [key]: selected });
    }
  };

  const pickFile = async (key: keyof AppConfig, extensions?: string[]) => {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: extensions ? [{ name: 'Scripts', extensions }] : undefined,
      title: t(`settings.${key as string}`),
    });
    if (selected && typeof selected === 'string') {
      updateConfig({ [key]: selected });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-6">
        {/* Language Selection */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <label className="flex items-center text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">
            <Languages className="mr-2 text-blue-500" size={18} />
            {t('settings.language')}
          </label>
          <select
            value={config.language}
            onChange={(e) => updateConfig({ language: e.target.value as any })}
            className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="auto">System Default</option>
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Path Settings */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center mb-2">
            <Terminal className="mr-2 text-blue-500" size={20} />
            Environment & Tools
          </h3>

          <PathInput
            label={t('settings.php_path')}
            value={config.phpPath}
            error={validation.errors.phpPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFile('phpPath', ['exe'])}
            onChange={(val) => updateConfig({ phpPath: val })}
            icon={<Terminal size={16} />}
          />

          <PathInput
            label={t('settings.game_path')}
            value={config.gameFolderPath}
            error={validation.errors.gameFolderPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFolder('gameFolderPath')}
            onChange={(val) => updateConfig({ gameFolderPath: val })}
            icon={<FolderOpen size={16} />}
          />

          <PathInput
            label={t('settings.save_path')}
            value={config.savegameFolderPath}
            error={validation.errors.savegameFolderPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFolder('savegameFolderPath')}
            onChange={(val) => updateConfig({ savegameFolderPath: val })}
            icon={<FolderOpen size={16} />}
          />

          <PathInput
            label={t('settings.parser_path')}
            value={config.parserToolPath}
            error={validation.errors.parserToolPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFile('parserToolPath', ['php'])}
            onChange={(val) => updateConfig({ parserToolPath: val })}
            icon={<FileCode size={16} />}
          />

          <PathInput
            label={t('settings.viewer_path')}
            value={config.viewerToolPath}
            error={validation.errors.viewerToolPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFile('viewerToolPath', ['php'])}
            onChange={(val) => updateConfig({ viewerToolPath: val })}
            icon={<FileCode size={16} />}
          />
        </div>

        {/* Debugging */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <label className="flex items-center text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">
            <Activity className="mr-2 text-blue-500" size={18} />
            Debugging
          </label>
          <button
            onClick={async () => {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('open_log_dir');
              } catch (e) {
                // Fallback to download if command fails
                const log = logger.getSessionLog();
                const blob = new Blob([log], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'x4-launcher-debug.log';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            }}
            className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {t('settings.view_debug_log')}
          </button>
        </div>

        {/* Web Settings */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <label className="flex items-center text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">
            <Globe className="mr-2 text-blue-500" size={18} />
            {t('settings.viewer_url')}
          </label>
          <input
            type="text"
            value={config.viewerUrl}
            onChange={(e) => updateConfig({ viewerUrl: e.target.value })}
            className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
};

interface PathInputProps {
  label: string;
  value: string;
  error?: boolean;
  errorText?: string;
  onPick: () => void;
  onChange: (val: string) => void;
  icon: React.ReactNode;
}

const PathInput: React.FC<PathInputProps> = ({ label, value, error, errorText, onPick, onChange, icon }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center">
      <span className="mr-2">{icon}</span>
      {label}
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 bg-white dark:bg-gray-950 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
          error ? 'border-red-500 dark:border-red-500/50' : 'border-gray-200 dark:border-gray-800'
        }`}
      />
      <button
        onClick={onPick}
        className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
      >
        Browse
      </button>
    </div>
    {error && (
      <p className="text-[10px] text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
        {errorText || 'Invalid path'}
      </p>
    )}
  </div>
);
