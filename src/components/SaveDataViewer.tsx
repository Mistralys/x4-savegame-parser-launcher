import React, { useEffect, useState } from 'react';
import { useSaveData, ApiResponse } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { RefreshCw, User, Coins, Calendar, MapPin, Hash, ShieldCheck } from 'lucide-react';

interface SaveInfo {
  saveName: string;
  playerName: string;
  money: number;
  moneyFormatted: string;
  saveDate: string;
  gameStartTime: number;
  gameGUID: string;
  gameCode: number;
}

export const SaveDataViewer: React.FC = () => {
  const { query, isLoading, error } = useSaveData();
  const { t } = useI18n();
  const [saveInfo, setSaveInfo] = useState<SaveInfo | null>(null);

  const fetchSaveInfo = async () => {
    try {
      const response = await query<SaveInfo>('quicksave', 'save-info');
      setSaveInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch save info', err);
    }
  };

  useEffect(() => {
    fetchSaveInfo();
  }, [query]);

  if (isLoading && !saveInfo) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
        <span className="text-gray-500 font-medium">{t('app.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50">
        <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">Error Loading Save Data</h3>
        <p className="text-sm text-red-500">{error}</p>
        <button 
          onClick={fetchSaveInfo}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Savegame Overview</h2>
        <button 
          onClick={fetchSaveInfo}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10"
          title="Refresh"
        >
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {saveInfo && (
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
        </div>
      )}
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
