import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Pagination } from '../hooks/useSaveData';

interface DataPaginationProps {
  pagination: Pagination;
  onPageChange: (offset: number) => void;
  isLoading?: boolean;
}

export const DataPagination: React.FC<DataPaginationProps> = ({
  pagination,
  onPageChange,
  isLoading
}) => {
  const { total, limit, offset } = pagination;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handleJump = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const page = parseInt(formData.get('page') as string);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange((page - 1) * limit);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 rounded-b-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(offset - limit)}
          disabled={offset === 0 || isLoading}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total || isLoading}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-bold text-gray-700 dark:text-gray-200">{offset + 1}</span> to{' '}
            <span className="font-bold text-gray-700 dark:text-gray-200">
              {Math.min(offset + limit, total)}
            </span>{' '}
            of <span className="font-bold text-gray-700 dark:text-gray-200">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px gap-1" aria-label="Pagination">
            <PaginationButton
              onClick={() => onPageChange(0)}
              disabled={offset === 0 || !!isLoading}
              icon={<ChevronsLeft size={16} />}
            />
            <PaginationButton
              onClick={() => onPageChange(offset - limit)}
              disabled={offset === 0 || !!isLoading}
              icon={<ChevronLeft size={16} />}
            />
            
            <form onSubmit={handleJump} className="flex items-center">
              <input
                name="page"
                type="number"
                min={1}
                max={totalPages}
                defaultValue={currentPage}
                key={currentPage}
                className="w-12 px-2 py-2 text-xs font-bold text-center text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="px-3 py-2 text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-800 border-r rounded-r-none whitespace-nowrap">
                of {totalPages}
              </div>
            </form>

            <PaginationButton
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total || !!isLoading}
              icon={<ChevronRight size={16} />}
            />
            <PaginationButton
              onClick={() => onPageChange((totalPages - 1) * limit)}
              disabled={offset + limit >= total || !!isLoading}
              icon={<ChevronsRight size={16} />}
            />
          </nav>
        </div>
      </div>
    </div>
  );
};

const PaginationButton: React.FC<{ 
  onClick: () => void; 
  disabled: boolean; 
  icon: React.ReactNode 
}> = ({ onClick, disabled, icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="relative inline-flex items-center p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
  >
    {icon}
  </button>
);
