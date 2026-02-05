import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSaveData } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { useProcess } from '../context/ProcessContext';
import { useNotification } from '../context/NotificationContext';
import { Database, Archive, CheckCircle2, Clock, RefreshCw, ChevronRight, Loader2, PlayCircle } from 'lucide-react';

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
  const { query, queueExtraction, getExtractionQueue, isLoading } = useSaveData();
  const { tools } = useProcess();
  const { showNotification } = useNotification();
  const { t } = useI18n();
  
  const [saves, setSaves] = useState<ListSavesData | null>(null);
  const [queueingIds, setQueueingIds] = useState<Set<string>>(new Set());
  const [queuedIds, setQueuedIds] = useState<Set<string>>(new Set());
  const lastEventRef = useRef<string | undefined>(undefined);

  const isMonitorRunning = tools.parser.status === 'running';

  const fetchQueue = useCallback(async () => {
    try {
      const data = await getExtractionQueue();
      setQueuedIds(new Set(data.queue));
    } catch (err) {
      console.error('Failed to fetch extraction queue', err);
    }
  }, [getExtractionQueue]);

  const fetchSaves = useCallback(async () => {
    try {
      const response = await query<ListSavesData>('', 'list-saves');
      setSaves(response.data);
      await fetchQueue();
    } catch (err) {
      console.error('Failed to fetch saves', err);
    }
  }, [query, fetchQueue]);

  // Initial fetch
  useEffect(() => {
    fetchSaves();
  }, [fetchSaves]);

  // Refresh on monitor completion
  useEffect(() => {
    const currentEvent = tools.parser.currentEvent;
    if (currentEvent === 'SAVE_PARSING_COMPLETE' && lastEventRef.current !== 'SAVE_PARSING_COMPLETE') {
      fetchSaves();
    }
    lastEventRef.current = currentEvent;
  }, [tools.parser.currentEvent, fetchSaves]);

  const handleSaveClick = async (save: SaveEntry) => {
    if (save.isUnpacked) {
      onSelect(save.id);
      return;
    }

    // Queue for extraction
    setQueueingIds(prev => new Set(prev).add(save.id));
    try {
      await queueExtraction(save.id);
      
      const message = isMonitorRunning
        ? `"${save.name}" has been added to the queue and will be extracted shortly.`
        : `"${save.name}" added to queue. Please start the Monitor tool to begin extraction.`;
      
      showNotification('info', 'Extraction Queued', message);
      
      // Local update to show it's queued if possible, or just refresh list
      await fetchSaves();
    } catch (err) {
      showNotification('warning', 'Queue Failed', `Could not queue "${save.name}" for extraction.`);
    } finally {
      setQueueingIds(prev => {
        const next = new Set(prev);
        next.delete(save.id);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm text-gray-500">Select a save to view details or trigger a new extraction.</p>
        </div>
        <button
          onClick={fetchSaves}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh List
        </button>
      </div>

      {!isMonitorRunning && (
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <PlayCircle size={18} className="text-blue-500 shrink-0" />
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
            The Monitor is offline. You can still queue saves, but they will only be processed once the Monitor is started.
          </p>
        </div>
      )}

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {!saves && isLoading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={48} className="animate-spin text-blue-500 opacity-20" />
              <p className="text-sm text-gray-400 italic">Scanning your X4 universe...</p>
           </div>
        ) : saves?.main.length === 0 && saves?.archived.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-12">No saves found. Ensure your game folders are configured correctly.</p>
        ) : null}

        {saves?.main && saves.main.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
               <Database size={16} className="text-blue-500" />
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Main Saves</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {saves.main.map((save) => (
                <SaveItem
                  key={save.id}
                  save={save}
                  isSelected={selectedId === save.id}
                  isQueueing={queueingIds.has(save.id)}
                  isQueued={queuedIds.has(save.id)}
                  onClick={() => handleSaveClick(save)}
                />
              ))}
            </div>
          </div>
        )}

        {saves?.archived && saves.archived.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 px-1">
               <Archive size={16} className="text-purple-500" />
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Archived Extracts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {saves.archived.map((save) => (
                <SaveItem
                  key={save.id}
                  save={save}
                  isArchived
                  isSelected={selectedId === save.id}
                  isQueueing={queueingIds.has(save.id)}
                  isQueued={queuedIds.has(save.id)}
                  onClick={() => handleSaveClick(save)}
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
  isQueueing: boolean;
  isQueued: boolean;
  onClick: () => void;
  isArchived?: boolean;
}> = ({ save, isSelected, isQueueing, isQueued, onClick, isArchived }) => (
  <button
    onClick={onClick}
    disabled={isQueueing || isQueued}
    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-4 group ${
      isSelected 
        ? 'bg-blue-500/10 border-blue-500 shadow-sm shadow-blue-500/10' 
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
    } ${isQueueing ? 'opacity-70 cursor-wait' : ''} ${isQueued ? 'opacity-90' : ''}`}
  >
    <div className={`p-2 rounded-lg ${
      isQueued ? 'bg-orange-500/10 text-orange-500' : (isArchived ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500')
    }`}>
      {isQueueing ? <Loader2 size={18} className="animate-spin" /> : (isQueued ? <Clock size={18} /> : (isArchived ? <Archive size={18} /> : <Database size={18} />))}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{save.name}</span>
        {save.isUnpacked ? (
          <span className="flex items-center text-[9px] font-bold text-green-500 uppercase tracking-tighter">
            <CheckCircle2 size={10} className="mr-0.5" /> Extracted
          </span>
        ) : (
          <span className={`flex items-center text-[9px] font-bold uppercase tracking-tighter ${isQueued ? 'text-orange-500' : 'text-blue-500'}`}>
            {isQueued ? (
              <><Loader2 size={10} className="mr-0.5 animate-spin" /> Queued for Extraction</>
            ) : (
              <><Clock size={10} className="mr-0.5" /> Ready to Extract</>
            )}
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
