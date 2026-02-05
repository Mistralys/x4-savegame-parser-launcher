import React from 'react';
import { Loader2 } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  getRowKey?: (item: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = "No data available",
  getRowKey
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-950/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.length > 0 ? (
              data.map((item, rowIdx) => (
                <tr
                  key={getRowKey ? getRowKey(item) : rowIdx}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                >
                  {columns.map((col, colIdx) => (
                    <td 
                      key={colIdx} 
                      className={`px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300 ${col.className || ''}`}
                    >
                      {typeof col.accessor === 'function' 
                        ? col.accessor(item) 
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : !isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Filler rows during loading to prevent layout jump
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length} className="px-6 py-4">&nbsp;</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
