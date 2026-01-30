import React, { useEffect, useState } from 'react';
import { useSaveData } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { Database, Archive, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight } from 'lucide-react';

export interface SaveEntry {
  id: string;
  name: string;
  dateModified: string;
  isUnpacked: boolean;
  hasBackup: boolean;
  storageFolder?: string;
}

export interface ListSavesData {
  main: SaveEntry[];
  archived: SaveEntry[];
}

interface SaveSelectorProps {
  onSelect: (saveId: string) => void;
  selectedId?: string;
}

export const SaveSelector: React.FC<SaveSelectorProps> = ({ onSelect, selectedId }) => {
  const { query, isLoading, error } = useSaveData();
  const { t } = useI18n();
  const [saves, setSaves] = useState<ListSavesData | null>(null);

  const fetchSaves = async () => {
    try {
      const response = await query<ListSavesData>('', 'list-saves');
      setSaves(response.data);
    } catch (err) {
      console.error('Failed to fetch saves', err);
    }
  };

  useEffect(() => {
    fetchSaves();
  }, [query]);

  if (isLoading && !saves) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-blue-500 mr-2" size={20} />
        <span className="text-sm text-gray-500">{t('app.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Database size={20} className="text-blue-500" />
          Available Savegames
        </h3>
        <button 
          onClick={fetchSaves}
          disabled={isLoading}
          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-md hover:bg-blue-500/10"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 text-xs text-red-500">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {saves?.main.length === 0 && saves?.archived.length === 0 && (
          <p className="text-sm text-gray-500 italic text-center py-4">No saves found.</p>
        )}

        {saves?.main && saves.main.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Main Saves</p>
            <div className="grid grid-cols-1 gap-2">
              {saves.main.map((save) => (
                <SaveItem 
                  key={save.id} 
                  save={save} 
                  isSelected={selectedId === save.id}
                  onClick={() => onSelect(save.id)}
                />
              ))}
            </div>
          </div>
        )}

        {saves?.archived && saves.archived.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Archived Extracts</p>
            <div className="grid grid-cols-1 gap-2">
              {saves.archived.map((save) => (
                <SaveItem 
                  key={save.id} 
                  save={save} 
                  isArchived
                  isSelected={selectedId === save.id}
                  onClick={() => onSelect(save.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SaveItem: React.FC<{ 
  save: SaveEntry; 
  isSelected: boolean; 
  onClick: () => void;
  isArchived?: boolean;
}> = ({ save, isSelected, onClick, isArchived }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-4 group ${
      isSelected 
        ? 'bg-blue-500/10 border-blue-500 shadow-sm shadow-blue-500/10' 
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
    }`}
  >
    <div className={`p-2 rounded-lg ${
      isArchived ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
    }`}>
      {isArchived ? <Archive size={18} /> : <Database size={18} />}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{save.name}</span>
        {save.isUnpacked && (
          <span className="flex items-center text-[9px] font-bold text-green-500 uppercase tracking-tighter">
            <CheckCircle2 size={10} className="mr-0.5" /> Extracted
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-0.5">
        <span className="flex items-center text-[10px] text-gray-400 font-medium">
          <Clock size={10} className="mr-1" />
          {new Date(save.dateModified).toLocaleDateString()} {new Date(save.dateModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {save.hasBackup && (
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Backup</span>
        )}
      </div>
    </div>

    <div className={`transition-transform duration-300 ${isSelected ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`}>
      <ChevronRight size={16} className="text-blue-500" />
    </div>
  </button>
);
