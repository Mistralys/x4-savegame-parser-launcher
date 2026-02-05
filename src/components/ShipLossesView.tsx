import React, { useEffect, useState, useCallback } from 'react';
import { useSaveData, Pagination } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { DataTable } from './DataTable';
import { DataPagination } from './DataPagination';
import { Ghost, ShieldAlert, RefreshCw, Filter } from 'lucide-react';

interface ShipLoss {
  time: number;
  timeFormatted: string;
  shipName: string;
  location: string;
  commander: string;
  destroyedBy: string;
  category: string;
}

interface ShipLossesViewProps {
  saveId: string;
}

export const ShipLossesView: React.FC<ShipLossesViewProps> = ({ saveId }) => {
  const { query, isLoading } = useSaveData();
  const { t } = useI18n();
  const [data, setData] = useState<ShipLoss[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [offset, setOffset] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'combat' | 'accident'>('all');

  const limit = 50;

  const fetchLosses = useCallback(async () => {
    try {
      let filter = 'reverse(sort_by([*], &time))';
      if (categoryFilter !== 'all') {
        filter = `[?category == '${categoryFilter}'] | ${filter}`;
      }

      const response = await query<ShipLoss[]>(saveId, 'ship-losses', {
        filter,
        limit,
        offset,
        cacheKey: `ship-losses-${categoryFilter}`
      });

      setData(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch ship losses', err);
    }
  }, [saveId, query, offset, categoryFilter]);

  useEffect(() => {
    fetchLosses();
  }, [fetchLosses]);

  const columns = [
    {
      header: 'Time',
      accessor: (item: ShipLoss) => (
        <span className="text-gray-400 font-mono text-[11px]">{item.timeFormatted}</span>
      )
    },
    {
      header: 'Ship Name',
      accessor: (item: ShipLoss) => (
        <span className="font-bold text-gray-800 dark:text-gray-200">{item.shipName}</span>
      )
    },
    {
      header: 'Location',
      accessor: (item: ShipLoss) => (
        <span>{item.location}</span>
      )
    },
    {
      header: 'Destroyed By',
      accessor: (item: ShipLoss) => (
        <span className="text-red-500 font-medium">{item.destroyedBy || 'Unknown'}</span>
      )
    },
    {
      header: 'Category',
      accessor: (item: ShipLoss) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          item.category === 'combat' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
        }`}>
          {item.category}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
            <Ghost size={20} />
          </div>
          <div>
            <p className="text-sm font-bold">Ship Losses</p>
            <p className="text-[10px] text-gray-400">Universe-wide attrition history</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <FilterButton 
              active={categoryFilter === 'all'} 
              onClick={() => { setCategoryFilter('all'); setOffset(0); }}
              label="All" 
            />
            <FilterButton 
              active={categoryFilter === 'combat'} 
              onClick={() => { setCategoryFilter('combat'); setOffset(0); }}
              label="Combat" 
            />
            <FilterButton 
              active={categoryFilter === 'accident'} 
              onClick={() => { setCategoryFilter('accident'); setOffset(0); }}
              label="Accident" 
            />
          </div>

          <button 
            onClick={fetchLosses}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="space-y-0">
        <DataTable<ShipLoss>
          columns={columns}
          data={data}
          isLoading={isLoading}
          getRowKey={(item) => `${item.time}-${item.shipName}`}
          emptyMessage="No ships have been lost in this savegame yet."
        />
        {pagination && (
          <DataPagination 
            pagination={pagination} 
            onPageChange={setOffset} 
            isLoading={isLoading} 
          />
        )}
      </div>

      {data.length > 0 && !isLoading && (
         <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <ShieldAlert size={16} className="text-blue-500" />
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Losses are recorded globally for all factions, helping you track universe-wide attrition.
            </p>
         </div>
      )}
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
