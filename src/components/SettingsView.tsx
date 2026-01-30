import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useConfig, AppConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';
import { useValidation } from '../context/ValidationContext';
import { FolderOpen, FileCode, Terminal, Globe, Languages, Activity, Download, Save, Database, ShieldCheck, FileJson, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { logger } from '../services/logger';

export const SettingsView: React.FC = () => {
  const { config, updateConfig, loadFromToolConfig, saveToToolConfig, toolConfigExists } = useConfig();
  const { t, availableLanguages } = useI18n();
  const { validation } = useValidation();
  const [isImporting, setIsImporting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold flex items-center">
              <Terminal className="mr-2 text-blue-500" size={20} />
              Environment & Tools
            </h3>
          </div>

          <PathInput
            label={t('settings.install_path')}
            value={config.installPath}
            error={validation.errors.installPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFolder('installPath')}
            onChange={(val) => updateConfig({ installPath: val })}
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
            label={t('settings.game_path')}
            value={config.gameFolderPath}
            error={validation.errors.gameFolderPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFolder('gameFolderPath')}
            onChange={(val) => updateConfig({ gameFolderPath: val })}
            icon={<FolderOpen size={16} />}
          />

          <PathInput
            label={t('settings.php_path')}
            value={config.phpPath}
            error={validation.errors.phpPath}
            errorText={t('errors.path_invalid')}
            onPick={() => pickFile('phpPath', ['exe'])}
            onChange={(val) => updateConfig({ phpPath: val })}
            icon={<Terminal size={16} />}
          />
        </div>

        {/* Tool Specific Settings */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center mb-2">
            <Database className="mr-2 text-blue-500" size={20} />
            {t('settings.tool_settings_title')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ToggleInput
              label={t('settings.auto_backup')}
              value={config.autoBackupEnabled}
              onChange={(val) => updateConfig({ autoBackupEnabled: val })}
              icon={<ShieldCheck size={16} />}
            />
            <ToggleInput
              label={t('settings.keep_xml')}
              value={config.keepXMLFiles}
              onChange={(val) => updateConfig({ keepXMLFiles: val })}
              icon={<FileCode size={16} />}
            />
            <ToggleInput
              label={t('settings.tool_logging')}
              value={config.loggingEnabled}
              onChange={(val) => updateConfig({ loggingEnabled: val })}
              icon={<Activity size={16} />}
            />
          </div>
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
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <label className="flex items-center text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
            <Globe className="mr-2 text-blue-500" size={18} />
            Web Server
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('settings.viewer_host')}
              </label>
              <input
                type="text"
                value={config.viewerHost}
                onChange={(e) => updateConfig({ viewerHost: e.target.value })}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('settings.viewer_port')} <span className="text-blue-500/70 font-normal">(Default: 9494)</span>
              </label>
              <input
                type="number"
                value={config.viewerPort}
                onChange={(e) => updateConfig({ viewerPort: parseInt(e.target.value) || 0 })}
                className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Configuration File Section */}
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center">
              <FileJson className="mr-2 text-blue-500" size={20} />
              {t('settings.config_section_title')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t('settings.config_status')}:
              </span>
              {toolConfigExists ? (
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                  <CheckCircle2 size={12} />
                  {t('settings.config_exists')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                  <AlertCircle size={12} />
                  {t('settings.config_missing')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={async () => {
                setIsImporting(true);
                try {
                  await loadFromToolConfig();
                  setFeedback({ type: 'success', message: t('settings.config_load_success') });
                } catch (e) {
                  setFeedback({ type: 'error', message: 'Failed to save configuration' });
                } finally {
                  setIsImporting(false);
                }
              }}
              disabled={isImporting || !toolConfigExists}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {t('settings.load_from_config')}
            </button>

            <button
              onClick={async () => {
                setIsSaving(true);
                try {
                  await saveToToolConfig();
                  setFeedback({ type: 'success', message: t('settings.config_save_success') });
                } catch (e) {
                  setFeedback({ type: 'error', message: 'Failed to save configuration' });
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving || !validation.isValid || !config.installPath}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {t('settings.save_to_config')}
            </button>
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {feedback.message}
            </div>
          )}
          
          {!validation.isValid && config.installPath && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              * {t('errors.fix_settings')}
            </p>
          )}
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

interface ToggleInputProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  icon: React.ReactNode;
}

const ToggleInput: React.FC<ToggleInputProps> = ({ label, value, onChange, icon }) => (
  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl">
    <div className="flex items-center gap-3">
      <span className="text-blue-500">{icon}</span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        value ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-800'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);
