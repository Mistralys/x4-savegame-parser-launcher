import React, { useState, useEffect, useCallback } from 'react';
import { useSaveData } from '../hooks/useSaveData';
import { useI18n } from '../context/I18nContext';
import { DataTable } from './DataTable';
import { DataPagination } from './DataPagination';
import { Search, Filter, ScrollText, AlertCircle, Info, Target, Settings, Lightbulb, Coins, ShieldAlert, Zap, Skull, TrendingUp, Gift, Star, Box, Flag, Users, Factory, Wrench, Ship } from 'lucide-react';

interface LogbookEntry {
  time: number;
  timeFormatted: string;
  categoryID: string;
  categoryLabel: string;
  title: string;
  text: string;
  money: number | null;
}

interface LogbookViewProps {
  saveId: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  combat: <ShieldAlert size={14} />,
  mission: <Target size={14} />,
  trade: <Coins size={14} />,
  'station-finance': <TrendingUp size={14} />,
  'station-building': <Factory size={14} />,
  'ship-construction': <Ship size={14} />,
  'ship-supply': <Wrench size={14} />,
  alert: <AlertCircle size={14} />,
  emergency: <Zap size={14} />,
  attacked: <ShieldAlert size={14} />,
  destroyed: <Skull size={14} />,
  promotion: <Star size={14} />,
  reward: <Gift size={14} />,
  reputation: <TrendingUp size={14} />,
  lockbox: <Box size={14} />,
  war: <Flag size={14} />,
  'crew-assignment': <Users size={14} />,
  tips: <Lightbulb size={14} />,
  misc: <Info size={14} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  combat: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mission: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  trade: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'station-finance': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'station-building': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'ship-construction': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'ship-supply': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  alert: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  emergency: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  attacked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  destroyed: 'bg-slate-800 text-slate-100 dark:bg-black dark:text-slate-400',
  promotion: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  reward: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  reputation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  lockbox: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  war: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'crew-assignment': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  tips: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  misc: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
};

export const LogbookView: React.FC<LogbookViewProps> = ({ saveId }) => {
  const { query, isLoading, error: apiError } = useSaveData();
  const { t } = useI18n();
  const [data, setData] = useState<LogbookEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const limit = 20;

  const formatGameTime = (time: number | string) => {
    const totalSeconds = typeof time === 'string' ? parseFloat(time) : time;
    if (isNaN(totalSeconds)) return String(time);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    result += `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
    return result;
  };

  const fetchLogbook = useCallback(async () => {
    try {
      // The API now returns entries in descending time order by default
      let filter = '';
      
      const conditions = [];
      if (search) {
         // Use contains_i for better performance and case-insensitivity if available
         const s = search.toLowerCase().replace(/'/g, "\\'");
         conditions.push(`(contains(to_lower(title), '${s}') || contains(to_lower(text), '${s}'))`);
      }
      if (categoryFilter !== 'all') {
         conditions.push(`categoryID == '${categoryFilter}'`);
      }

      if (conditions.length > 0) {
        filter = `[?${conditions.join(' && ')}]`;
      }

      const response = await query<LogbookEntry[]>(saveId, 'log', {
        filter,
        limit,
        offset: (page - 1) * limit
      });

      if (response.success && Array.isArray(response.data)) {
        setData(response.data);
        setTotal(response.pagination?.total || response.data.length);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Failed to fetch logbook', err);
      setData([]);
      setTotal(0);
    }
  }, [saveId, query, page, search, categoryFilter]);

  useEffect(() => {
    fetchLogbook();
  }, [fetchLogbook]);

  const columns = [
    {
      header: t('logbook.time'),
      accessor: (item: LogbookEntry) => (
        <span className="font-mono text-xs opacity-70">
          {item.timeFormatted || formatGameTime(item.time)}
        </span>
      ),
      className: 'w-32'
    },
    {
      header: t('logbook.category'),
      accessor: (item: LogbookEntry) => (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit ${CATEGORY_COLORS[item.categoryID] || 'bg-gray-100 text-gray-600'}`}>
          {CATEGORY_ICONS[item.categoryID] || <ScrollText size={14} />}
          {item.categoryID ? (t(`logbook.categories.${item.categoryID}`) === `logbook.categories.${item.categoryID}` ? item.categoryLabel : t(`logbook.categories.${item.categoryID}`)) : t('logbook.categories.misc')}
        </div>
      ),
      className: 'w-32'
    },
    {
      header: t('logbook.event'),
      accessor: (item: LogbookEntry) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-gray-800 dark:text-gray-200">{item.title}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.text}</span>
        </div>
      )
    },
    {
      header: t('logbook.money'),
      accessor: (item: LogbookEntry) => {
        if (item.money === null || item.money === undefined) return null;
        // The API returns money in centicredits (Cr * 100)
        const credits = item.money / 100;
        const isPositive = credits > 0;
        return (
          <span className={`font-mono font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{credits.toLocaleString()} Cr
          </span>
        );
      },
      className: 'text-right w-32'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ScrollText size={20} className="text-blue-500" />
            {t('logbook.title')}
          </h3>
          <p className="text-sm text-gray-500">{t('logbook.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text"
              placeholder={t('logbook.search_placeholder')}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64 transition-all"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <select
              className="pl-10 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t('logbook.categories.all')}</option>
              {Object.keys(CATEGORY_ICONS).map(cat => (
                <option key={cat} value={cat}>{t(`logbook.categories.${cat}`)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{apiError}</p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage={t('logbook.empty')}
      />

      <DataPagination
        pagination={{ total, limit, offset: (page - 1) * limit, hasMore: (page * limit) < total }}
        onPageChange={(newOffset) => setPage(Math.floor(newOffset / limit) + 1)}
        isLoading={isLoading}
      />
    </div>
  );
};
