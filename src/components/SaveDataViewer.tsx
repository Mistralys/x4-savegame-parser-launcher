import React, { useEffect, useState, useCallback } from 'react';
import { useSaveData } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { useProcess } from '../context/ProcessContext';
import { RefreshCw, User, Coins, Calendar, MapPin, Hash, ShieldCheck, Database, Zap, LayoutDashboard, Ghost, Ship, Factory, ScrollText, ChevronLeft } from 'lucide-react';
import { SaveSelector } from './SaveSelector';
import { ShipLossesView } from './ShipLossesView';
import { OwnedShipsView } from './OwnedShipsView';
import { LogbookView } from './LogbookView';

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

const CategoryTab: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, active, onClick, disabled }) => (
  <button
    onClick={!disabled ? onClick : undefined}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
      disabled ? 'opacity-30 cursor-not-allowed filter grayscale border-transparent' :
      active 
        ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
    }`}
  >
    {icon}
    {label}
  </button>
);

export const SaveDataViewer: React.FC = () => {
  const { query, isLoading, error } = useSaveData();
  const { tools } = useProcess();
  const { t } = useI18n();
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'overview' | 'ship-losses' | 'ships' | 'stations' | 'logbook'>('overview');
  const [saveInfo, setSaveInfo] = useState<SaveInfo | null>(null);

  const isMonitorRunning = tools.parser.status === 'running';

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
    } else {
      setSaveInfo(null);
    }
  }, [selectedSaveId, fetchSaveInfo]);

  // Master Mode: Show Save Selection
  if (!selectedSaveId) {
    return <SaveSelector onSelect={setSelectedSaveId} />;
  }

  // Detail Mode: Show Analysis UI
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Navigation Breadcrumb */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedSaveId(null)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-blue-500 transition-all hover:bg-blue-500/10 group"
              title="Back to list"
            >
              <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  <Database size={12} className="text-blue-500" />
                  Active Analysis
               </div>
               <h2 className="text-xl font-extrabold tracking-tight">
                  {saveInfo?.saveName || selectedSaveId}
               </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeScreen === 'overview' && (
              <button 
                onClick={() => fetchSaveInfo(selectedSaveId)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh Data
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Category Tabs */}
        <nav className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 w-fit">
           <CategoryTab 
              icon={<LayoutDashboard size={16} />} 
              label="Overview" 
              active={activeScreen === 'overview'} 
              onClick={() => setActiveScreen('overview')} 
           />
           <CategoryTab 
              icon={<Ghost size={16} />} 
              label="Ship Losses" 
              active={activeScreen === 'ship-losses'} 
              onClick={() => setActiveScreen('ship-losses')} 
           />
           <CategoryTab
              icon={<Ship size={16} />}
              label="Owned Ships"
              active={activeScreen === 'ships'}
              onClick={() => setActiveScreen('ships')}
           />
           <CategoryTab 
              icon={<Factory size={16} />} 
              label="Stations" 
              disabled
              active={activeScreen === 'stations'} 
              onClick={() => setActiveScreen('stations')} 
           />
           <CategoryTab
              icon={<ScrollText size={16} />}
              label="Logbook"
              active={activeScreen === 'logbook'}
              onClick={() => setActiveScreen('logbook')}
           />
        </nav>
      </div>

      {/* Warning if Monitor is offline and save not extracted */}
      {selectedSaveId && !saveInfo && !isLoading && !isMonitorRunning && activeScreen === 'overview' && (
        <div className="p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 flex gap-4 animate-in slide-in-from-top-4 duration-300">
           <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 h-fit">
              <ShieldCheck size={20} />
           </div>
           <div>
              <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-400">Save not extracted</h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-500/80 mt-0.5">
                This savegame has not been processed yet. Start the Monitor tool to begin extraction.
              </p>
           </div>
        </div>
      )}

      {/* Active Screen Content */}
      <div className="relative min-h-[400px]">
        {isLoading && activeScreen === 'overview' && !saveInfo ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <RefreshCw className="animate-spin text-blue-500 opacity-20" size={48} />
            <p className="text-sm text-gray-400 font-medium italic">Retrieving save information...</p>
          </div>
        ) : error && activeScreen === 'overview' ? (
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
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 duration-400">
            {activeScreen === 'overview' && saveInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className="lg:col-span-2"
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

            {activeScreen === 'ship-losses' && selectedSaveId && (
               <ShipLossesView saveId={selectedSaveId} />
            )}

            {activeScreen === 'ships' && selectedSaveId && (
               <OwnedShipsView saveId={selectedSaveId} />
            )}

            {activeScreen === 'logbook' && selectedSaveId && (
               <LogbookView saveId={selectedSaveId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
