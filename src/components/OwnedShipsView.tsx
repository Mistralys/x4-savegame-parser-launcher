import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSaveData, Pagination } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { DataTable } from './DataTable';
import { DataPagination } from './DataPagination';
import { Ship, RefreshCw, Search, X, ChevronDown } from 'lucide-react';

interface ShipData {
  componentID: string;
  connectionID: string;
  name: string;
  owner: string;
  sector: string;
  zone: string;
  class: string;
  size: string;
  hull: string;
  'hull-type': string;
  'build-faction': string;
  macro: string;
  code: string;
}

interface OwnedShipsViewProps {
  saveId: string;
}

export const OwnedShipsView: React.FC<OwnedShipsViewProps> = ({ saveId }) => {
  const { query, isLoading } = useSaveData();
  const { t } = useI18n();
  const [data, setData] = useState<ShipData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [offset, setOffset] = useState(0);
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'combat' | 'trade' | 'mining' | 'scout'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | 's' | 'm' | 'l' | 'xl'>('all');
  const [factionFilter, setFactionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const limit = 20;

  // Simple debounce for search input
  useEffect(() => {
      const timer = setTimeout(() => {
          setDebouncedSearch(searchQuery);
          setOffset(0); // Reset pagination on search
      }, 300);
      return () => clearTimeout(timer);
  }, [searchQuery]);

  const availableFactions = useMemo(() => {
      return [
          { id: 'all', name: t('ships.filters.size.all') },
          { id: 'arg', name: 'Argon Federation' },
          { id: 'ant', name: 'Antigone Republic' },
          { id: 'tel', name: 'Teladi Company' },
          { id: 'par', name: 'Godrealm of the Paranid' },
          { id: 'hop', name: 'Holy Order of the Pontifex' },
          { id: 'spl', name: 'Split' },
          { id: 'ter', name: 'Terran Protectorate' },
          { id: 'pio', name: 'Segaris Pioneers' },
          { id: 'bor', name: 'Boron' },
          { id: 'xen', name: 'Xenon (Captured)' },
          { id: 'yak', name: 'Yaki' }
      ];
  }, [t]);

  const fetchShips = useCallback(async () => {
    try {
      let conditions = ["owner=='player'"];
      
      if (purposeFilter === 'combat') conditions.push("(hull == 'fighter' || hull == 'heavyfighter' || hull == 'corvette' || hull == 'frigate' || hull == 'destroyer' || hull == 'carrier')");
      if (purposeFilter === 'trade') conditions.push("hull == 'trans'");
      if (purposeFilter === 'mining') conditions.push("hull == 'miner'");
      if (purposeFilter === 'scout') conditions.push("hull == 'scout'");
      
      if (sizeFilter !== 'all') {
          conditions.push(`size == '${sizeFilter}'`);
      }

      if (factionFilter !== 'all') {
          conditions.push(`"build-faction" == '${factionFilter}'`);
      }

      if (debouncedSearch) {
          const s = debouncedSearch.replace(/'/g, "\\'");
          conditions.push(`(contains_i(name, '${s}') || contains_i(code, '${s}'))`);
      }

      const filter = `[?${conditions.join(' && ')}] | sort_by([*], &name)`;

      const response = await query<ShipData[]>(saveId, 'ships', {
        filter,
        limit,
        offset
      });

      setData(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch owned ships', err);
    }
  }, [saveId, query, offset, purposeFilter, sizeFilter, factionFilter, debouncedSearch]);

  useEffect(() => {
    fetchShips();
  }, [fetchShips]);

  const columns = [
    {
      header: t('ships.name'),
      accessor: (item: ShipData) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800 dark:text-gray-200">{item.name || 'Unnamed Ship'}</span>
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">{item.code}</span>
             <span className="text-[10px] text-gray-400 font-mono">{item.componentID}</span>
          </div>
        </div>
      )
    },
    {
      header: t('ships.class'),
      accessor: (item: ShipData) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {(item.size || 's').toUpperCase()}
        </span>
      )
    },
    {
      header: 'Role',
      accessor: (item: ShipData) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500">
          {item.hull} {item['hull-type']}
        </span>
      )
    },
    {
      header: t('ships.sector'),
      accessor: (item: ShipData) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate" title={item.sector}>
            {item.sector?.split(' ').slice(1).join(' ') || 'Unknown Sector'}
          </span>
          <span className="text-[10px] text-gray-400 truncate" title={item.zone}>
            {item.zone?.split(' ').slice(1).join(' ') || 'Unknown Zone'}
          </span>
        </div>
      )
    },
    {
        header: 'Faction',
        accessor: (item: ShipData) => (
          <span className="text-[10px] font-bold uppercase text-gray-400">{item['build-faction']}</span>
        )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Ship size={20} />
                </div>
                <div>
                    <p className="text-sm font-bold">{t('ships.title')}</p>
                    <p className="text-[10px] text-gray-400">{t('ships.subtitle')}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('ships.search_placeholder')}
                        className="pl-9 pr-8 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 w-64 transition-all"
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
                    onClick={fetchShips}
                    disabled={isLoading}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10"
                >
                    <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
            {/* Purpose Filter */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">{t('ships.filter_by_role')}</span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FilterButton active={purposeFilter === 'all'} onClick={() => { setPurposeFilter('all'); setOffset(0); }} label={t('ships.filters.all')} />
                    <FilterButton active={purposeFilter === 'combat'} onClick={() => { setPurposeFilter('combat'); setOffset(0); }} label={t('ships.filters.combat')} />
                    <FilterButton active={purposeFilter === 'trade'} onClick={() => { setPurposeFilter('trade'); setOffset(0); }} label={t('ships.filters.trade')} />
                    <FilterButton active={purposeFilter === 'mining'} onClick={() => { setPurposeFilter('mining'); setOffset(0); }} label={t('ships.filters.mining')} />
                    <FilterButton active={purposeFilter === 'scout'} onClick={() => { setPurposeFilter('scout'); setOffset(0); }} label={t('ships.filters.scout')} />
                </div>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block" />

            {/* Size Filter */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">{t('ships.filter_by_size')}</span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FilterButton active={sizeFilter === 'all'} onClick={() => { setSizeFilter('all'); setOffset(0); }} label={t('ships.filters.size.all')} />
                    <FilterButton active={sizeFilter === 's'} onClick={() => { setSizeFilter('s'); setOffset(0); }} label={t('ships.filters.size.s')} />
                    <FilterButton active={sizeFilter === 'm'} onClick={() => { setSizeFilter('m'); setOffset(0); }} label={t('ships.filters.size.m')} />
                    <FilterButton active={sizeFilter === 'l'} onClick={() => { setSizeFilter('l'); setOffset(0); }} label={t('ships.filters.size.l')} />
                    <FilterButton active={sizeFilter === 'xl'} onClick={() => { setSizeFilter('xl'); setOffset(0); }} label={t('ships.filters.size.xl')} />
                </div>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden md:block" />

            {/* Faction Filter (Dropdown) */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
                <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">{t('ships.filter_by_faction')}</span>
                <div className="relative group">
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-blue-500" />
                    <select 
                        value={factionFilter}
                        onChange={(e) => { setFactionFilter(e.target.value); setOffset(0); }}
                        className="appearance-none w-full pl-4 pr-10 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 cursor-pointer transition-all"
                    >
                        {availableFactions.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-0">
        <DataTable<ShipData>
          columns={columns}
          data={data}
          isLoading={isLoading}
          getRowKey={(item) => item.componentID}
          emptyMessage={t('ships.empty')}
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

const FilterButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all whitespace-nowrap ${
      active 
        ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);
