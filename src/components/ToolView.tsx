import React from 'react';
import { Play, Square, Trash2, ExternalLink, Activity } from 'lucide-react';
import { useProcess, ToolStatus } from '../context/ProcessContext';
import { useI18n } from '../context/I18nContext';
import { useValidation } from '../context/ValidationContext';
import { useConfig } from '../context/ConfigContext';
import { LogViewer } from './LogViewer';
import { BlockingModal } from './BlockingModal';
import { openUrl } from '@tauri-apps/plugin-opener';

interface ToolViewProps {
  tool: 'parser' | 'viewer';
}

export const ToolView: React.FC<ToolViewProps> = ({ tool }) => {
  const { tools, startTool, stopTool, clearLogs } = useProcess();
  const { t } = useI18n();
  const { validation } = useValidation();
  const { config } = useConfig();
  
  const state = tools[tool];
  const isRunning = state.status === 'running';
  const isTransitioning = state.status === 'starting' || state.status === 'stopping';

  const handleToggle = async () => {
    if (isRunning) {
      await stopTool(tool);
    } else {
      await startTool(tool);
    }
  };

  const handleOpenBrowser = async () => {
    if (config.viewerHost && config.viewerPort) {
      await openUrl(`http://${config.viewerHost}:${config.viewerPort}`);
    }
  };

  return (
    <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <BlockingModal isVisible={!validation.isValid} />
      
      {/* Status Bar */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isRunning ? 'bg-green-500/10 text-green-500' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
            <Activity size={24} className={isRunning ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-lg font-bold capitalize">{tool}</h3>
            <p className="text-xs font-medium text-gray-500">
              {t('app.status')}: <span className={isRunning ? 'text-green-500' : 'text-gray-400'}>
                {isRunning ? t('tools.running') : t('tools.stopped')}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tool === 'viewer' && isRunning && (
            <button
              onClick={handleOpenBrowser}
              className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors"
              title={t('tools.open_browser')}
            >
              <ExternalLink size={20} />
            </button>
          )}
          <button
            onClick={() => clearLogs(tool)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition-colors"
            title={t('tools.clear_logs')}
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={handleToggle}
            disabled={isTransitioning || (!isRunning && !validation.isValid)}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              isRunning 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25'
            } disabled:opacity-50`}
          >
            {isRunning ? (
              <><Square size={16} fill="currentColor" /> {t('tools.stop')}</>
            ) : (
              <><Play size={16} fill="currentColor" /> {t('tools.start')}</>
            )}
          </button>
        </div>
      </div>

      {/* Log Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terminal Output</label>
          <span className="text-[10px] text-gray-400 font-mono">{state.logs.length} lines buffered</span>
        </div>
        <LogViewer logs={state.logs} />
      </div>
    </div>
  );
};
