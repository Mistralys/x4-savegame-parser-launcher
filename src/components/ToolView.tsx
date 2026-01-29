import React, { useEffect, useState } from 'react';
import { Play, Square, Trash2, ExternalLink, Activity, FileText, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [pulse, setPulse] = useState(false);

  // Pulse effect when a new tick or event arrives
  useEffect(() => {
    if (state.lastTick || state.currentEvent) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.lastTick, state.currentEvent]);

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
          <div className={`p-3 rounded-xl transition-all duration-300 ${
            isRunning
              ? (pulse ? 'bg-green-500/30 text-green-400' : 'bg-green-500/10 text-green-500')
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
          }`}>
            <Activity size={24} className={isRunning ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold capitalize">{tool}</h3>
              {state.version && (
                <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-gray-500">
                  v{state.version}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-500">
              {t('app.status')}: <span className={isRunning ? 'text-green-500' : 'text-gray-400'}>
                {isRunning ? (state.currentEvent ? t(`tools.events.${state.currentEvent}`) : t('tools.running')) : t('tools.stopped')}
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
  
        {/* Structured Info (Parser only) */}
        {tool === 'parser' && isRunning && state.detectedSave && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-500/50 uppercase tracking-wider">{t('tools.latest_save')}</p>
                <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={state.detectedSave.path}>
                  {state.detectedSave.name}
                </p>
              </div>
            </div>
            
            {state.currentEvent && (
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-green-500/50 uppercase tracking-wider">Current Activity</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {t(`tools.events.${state.currentEvent}`)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Details */}
      {state.error && (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-600 dark:text-red-400">Process Error</h4>
              <p className="text-sm text-red-500 mt-1 font-medium">{state.error.message}</p>
              {state.error.code && (
                <p className="text-[10px] font-mono text-red-400 mt-1">Code: {state.error.code}</p>
              )}
            </div>
          </div>

          {state.error.errors && state.error.errors.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Error Chain</p>
              {state.error.errors.map((err, idx) => (
                <ErrorItem key={idx} error={err} isFirst={idx === 0} />
              ))}
            </div>
          )}
        </div>
      )}

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

const ErrorItem: React.FC<{ error: any; isFirst: boolean }> = ({ error, isFirst }) => {
  const [expanded, setExpanded] = useState(isFirst);

  return (
    <div className="rounded-xl bg-white/50 dark:bg-black/20 border border-red-200/50 dark:border-red-900/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-500/5 transition-colors"
      >
        <span className="text-red-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{error.message}</p>
          <p className="text-[9px] font-mono text-gray-400 truncate">{error.class}</p>
        </div>
        {error.code && (
          <span className="text-[9px] font-mono bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">
            {error.code}
          </span>
        )}
      </button>
      
      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-red-200/30 dark:border-red-900/20">
          {error.details && (
            <div className="mt-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Details</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-red-500/5 p-2 rounded-lg">{error.details}</p>
            </div>
          )}
          {error.trace && (
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stack Trace</p>
              <pre className="text-[10px] text-gray-500 font-mono bg-black/5 dark:bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre">
                {error.trace}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
