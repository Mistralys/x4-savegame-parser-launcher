import React, { useEffect, useState, useCallback } from 'react';
import { useSaveData } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { useProcess } from '../context/ProcessContext';
import { RefreshCw, User, Coins, Calendar, MapPin, Hash, ShieldCheck, Database, Zap } from 'lucide-react';
import { SaveSelector } from './SaveSelector';

interface SaveInfo {
  saveName: string;
  playerName: string;
  money: number;
  moneyFormatted: string;
  saveDate: string;
  gameStartTime: number;
  gameGUID: string;
  gameCode: number;
  extractionDurationSeconds?: number;
  extractionDurationFormatted?: string;
}

export const SaveDataViewer: React.FC = () => {
  const { query, isLoading, error } = useSaveData();
  const { tools } = useProcess();
  const { t } = useI18n();
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState<SaveInfo | null>(null);

  const fetchSaveInfo = useCallback(async (saveId: string) => {
    try {
      const response = await query<SaveInfo>(saveId, 'save-info');
      setSaveInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch save info', err);
      setSaveInfo(null);
    }
  }, [query]);

  useEffect(() => {
    if (selectedSaveId) {
      fetchSaveInfo(selectedSaveId);
    }
  }, [selectedSaveId, fetchSaveInfo]);

  const isMonitorRunning = tools.parser.status === 'running';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar: Save Selector */}
      <div className="lg:col-span-1 border-r border-gray-100 dark:border-gray-800 pr-8">
        <SaveSelector 
          selectedId={selectedSaveId || undefined} 
          onSelect={setSelectedSaveId} 
        />
      </div>

      {/* Main Content: Save Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Database size={24} className="text-blue-500" />
            Savegame Overview
          </h2>
          {selectedSaveId && (
            <button 
              onClick={() => fetchSaveInfo(selectedSaveId)}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10"
              title="Refresh"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {selectedSaveId && !saveInfo && !isLoading && !isMonitorRunning && (
          <div className="p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 flex gap-4 animate-in slide-in-from-top-4 duration-300">
             <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 h-fit">
                <ShieldCheck size={20} />
             </div>
             <div>
                <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-400">Save not extracted</h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-500/80 mt-0.5">
                  This savegame has not been processed yet. Start the Parser tool to begin extraction.
                </p>
             </div>
          </div>
        )}

        {!selectedSaveId ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
            <div className="p-4 rounded-full bg-blue-500/10 text-blue-500 mb-4">
              <Database size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Save Selected</h3>
            <p className="text-sm text-gray-400 max-w-xs mt-1">
              Please select a savegame from the list on the left to view its detailed information.
            </p>
          </div>
        ) : isLoading && !saveInfo ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
            <span className="text-gray-500 font-medium">{t('app.loading')}</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50">
            <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">Error Loading Save Data</h3>
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={() => fetchSaveInfo(selectedSaveId)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : saveInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard 
              icon={<User className="text-blue-500" size={20} />}
              label="Player Name"
              value={saveInfo.playerName}
            />
            <InfoCard 
              icon={<Coins className="text-yellow-500" size={20} />}
              label="Credits"
              value={`${saveInfo.moneyFormatted} Cr`}
            />
            <InfoCard 
              icon={<Calendar className="text-green-500" size={20} />}
              label="Save Date"
              value={new Date(saveInfo.saveDate).toLocaleString()}
            />
            <InfoCard 
              icon={<MapPin className="text-purple-500" size={20} />}
              label="Game Name"
              value={saveInfo.saveName}
            />
            <InfoCard 
              icon={<ShieldCheck className="text-indigo-500" size={20} />}
              label="Game GUID"
              value={saveInfo.gameGUID}
              className="md:col-span-2"
            />
            <InfoCard 
              icon={<Hash className="text-orange-500" size={20} />}
              label="Game Code"
              value={saveInfo.gameCode.toString()}
            />
            {saveInfo.extractionDurationFormatted && (
              <InfoCard
                icon={<Zap className="text-yellow-400" size={20} />}
                label="Extraction Time"
                value={saveInfo.extractionDurationFormatted}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  className?: string;
}> = ({ icon, label, value, className }) => (
  <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center gap-4 ${className}`}>
    <div className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">{value}</p>
    </div>
  </div>
);
