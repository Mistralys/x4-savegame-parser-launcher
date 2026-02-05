import React, { useEffect, useState, useCallback } from 'react';
import { useSaveData, Pagination } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { DataTable } from './DataTable';
import { DataPagination } from './DataPagination';
import { Ship, RefreshCw } from 'lucide-react';

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

  const limit = 50;

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
  }, [saveId, query, offset, purposeFilter, sizeFilter]);

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

            <button 
            onClick={fetchShips}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10"
            >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>

        <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
            {/* Purpose Filter */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">Filter by Role</span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FilterButton active={purposeFilter === 'all'} onClick={() => { setPurposeFilter('all'); setOffset(0); }} label={t('ships.filters.all')} />
                    <FilterButton active={purposeFilter === 'combat'} onClick={() => { setPurposeFilter('combat'); setOffset(0); }} label={t('ships.filters.combat')} />
                    <FilterButton active={purposeFilter === 'trade'} onClick={() => { setPurposeFilter('trade'); setOffset(0); }} label={t('ships.filters.trade')} />
                    <FilterButton active={purposeFilter === 'mining'} onClick={() => { setPurposeFilter('mining'); setOffset(0); }} label={t('ships.filters.mining')} />
                    <FilterButton active={purposeFilter === 'scout'} onClick={() => { setPurposeFilter('scout'); setOffset(0); }} label={t('ships.filters.scout')} />
                </div>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Size Filter */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase ml-1">Filter by Size</span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FilterButton active={sizeFilter === 'all'} onClick={() => { setSizeFilter('all'); setOffset(0); }} label={t('ships.filters.size.all')} />
                    <FilterButton active={sizeFilter === 's'} onClick={() => { setSizeFilter('s'); setOffset(0); }} label={t('ships.filters.size.s')} />
                    <FilterButton active={sizeFilter === 'm'} onClick={() => { setSizeFilter('m'); setOffset(0); }} label={t('ships.filters.size.m')} />
                    <FilterButton active={sizeFilter === 'l'} onClick={() => { setSizeFilter('l'); setOffset(0); }} label={t('ships.filters.size.l')} />
                    <FilterButton active={sizeFilter === 'xl'} onClick={() => { setSizeFilter('xl'); setOffset(0); }} label={t('ships.filters.size.xl')} />
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
    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
      active 
        ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);
