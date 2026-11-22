import React, { useEffect, useState, useCallback } from 'react';
import { useSaveData, Pagination } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { useDebounce } from '../hooks/useDebounce';
import { DataTable } from './DataTable';
import { DataPagination } from './DataPagination';
import { Factory, RefreshCw, Search, X } from 'lucide-react';

interface StationData {
  componentID: string;
  connectionID: string;
  parentComponent: string;
  class: string;
  code: string;
  name: string;
  owner: string;
  macro: string;
  state: string;
  ships?: string[];
}

interface StationsViewProps {
  saveId: string;
}

export const StationsView: React.FC<StationsViewProps> = ({ saveId }) => {
  const { query, isLoading } = useSaveData();
  const { t } = useI18n();
  const [data, setData] = useState<StationData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [offset, setOffset] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedClassSearch = useDebounce(classSearch, 300);

  const limit = 20;

  // Reset offset when debounced search values change
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, debouncedClassSearch]);

  const buildFilter = useCallback((): string => {
    const conditions: string[] = [];

    if (!showAll) {
      conditions.push("owner=='player'");
    }

    if (debouncedSearch) {
      const s = debouncedSearch.replace(/'/g, "\\'");
      conditions.push(`(contains_i(name, '${s}') || contains_i(code, '${s}'))`);
    }

    if (debouncedClassSearch) {
      const c = debouncedClassSearch.replace(/'/g, "\\'");
      conditions.push(`contains_i(class, '${c}')`);
    }

    if (conditions.length === 0) {
      return `[*] | sort_by([*], &code)`;
    }

    return `[?${conditions.join(' && ')}] | sort_by([*], &code)`;
  }, [showAll, debouncedSearch, debouncedClassSearch]);

  const fetchStations = useCallback(async () => {
    try {
      const filter = buildFilter();
      const response = await query<StationData[]>(saveId, 'stations', {
        filter,
        limit,
        offset,
      });
      setData(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch stations', err);
    }
  }, [saveId, query, offset, buildFilter]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const columns = [
    {
      header: t('stations.code'),
      accessor: (item: StationData) => (
        <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">
          {item.code}
        </span>
      ),
    },
    {
      header: t('stations.name'),
      accessor: (item: StationData) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-800 dark:text-gray-200">
            {item.name || item.code}
          </span>
          {item.state === 'wreck' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {t('stations.state_wreck')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('stations.type'),
      accessor: (item: StationData) => (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 block truncate max-w-[220px]"
          title={item.macro}
        >
          {item.macro.replace(/_macro$/, '')}
        </span>
      ),
    },
    {
      header: t('stations.state'),
      accessor: (item: StationData) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            item.state === 'wreck'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-green-500/10 text-green-600 dark:text-green-400'
          }`}
        >
          {item.state === 'wreck' ? t('stations.state_wreck') : t('stations.state_normal')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Factory size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">{t('stations.title')}</p>
              <p className="text-[10px] text-gray-400">{t('stations.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Name/Code Search */}
            <div className="relative group">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('stations.search_placeholder')}
                className="pl-9 pr-8 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 w-56 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={fetchStations}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
          {/* Show All / Player Only Toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">
              {showAll ? t('stations.show_all') : t('stations.player_only')}
            </span>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowAll(false); setOffset(0); }}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
                  !showAll
                    ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t('stations.player_only')}
              </button>
              <button
                onClick={() => { setShowAll(true); setOffset(0); }}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
                  showAll
                    ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t('stations.show_all')}
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block" />

          {/* Class Search */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">
              {t('stations.class_search_label')}
            </span>
            <div className="relative group">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder={t('stations.class_search_placeholder')}
                className="pl-9 pr-8 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 w-48 transition-all"
              />
              {classSearch && (
                <button
                  onClick={() => setClassSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        <DataTable<StationData>
          columns={columns}
          data={data}
          isLoading={isLoading}
          getRowKey={(item) => item.componentID}
          emptyMessage={showAll ? t('stations.empty_all') : t('stations.empty')}
        />
        {pagination && (
          <DataPagination
            pagination={pagination}
            onPageChange={setOffset}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
