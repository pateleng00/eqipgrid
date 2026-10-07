import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { cn } from '../lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemName?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 7,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [7, 14, 21, 28, 35, 42, 49],
  className,
  itemName = 'entries',
}) => {
  const { isDaylight } = useTheme();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none transition-colors',
        isDaylight
          ? 'border-slate-200 bg-white text-slate-800'
          : 'border-slate-800/80 bg-slate-950/70 text-slate-300',
        className
      )}
    >
      {/* Range and total counter */}
      <div className="flex items-center gap-3">
        <span className={cn('text-xs', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
          Showing <span className={cn('font-bold font-mono', isDaylight ? 'text-slate-950' : 'text-white')}>{startItem}</span> to{' '}
          <span className={cn('font-bold font-mono', isDaylight ? 'text-slate-950' : 'text-white')}>{endItem}</span> of{' '}
          <span className={cn('font-bold font-mono', isDaylight ? 'text-slate-950' : 'text-white')}>{totalItems}</span> {itemName}
        </span>

        {/* Page size picker if handler provided */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className={cn('text-[11px]', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none transition-colors cursor-pointer',
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-950 hover:border-slate-400'
                  : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600'
              )}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First Page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          title="First page"
          className={cn(
            'p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
            isDaylight
              ? 'border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950'
              : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>

        {/* Prev Page button */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          title="Previous page"
          className={cn(
            'p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 px-2.5',
            isDaylight
              ? 'border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-semibold'
              : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden md:inline text-[11px]">Prev</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className={cn('px-1 text-slate-400 font-bold select-none')}
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safeCurrentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                style={
                  isActive
                    ? {
                        backgroundColor: '#4f46e5',
                        color: '#ffffff',
                      }
                    : undefined
                }
                className={cn(
                  'min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center font-mono',
                  isActive
                    ? 'bg-indigo-600 !text-white shadow-xs'
                    : isDaylight
                    ? 'border border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-semibold'
                    : 'border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page button */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          title="Next page"
          className={cn(
            'p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 px-2.5',
            isDaylight
              ? 'border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-semibold'
              : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
          )}
        >
          <span className="hidden md:inline text-[11px]">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Last Page button */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          title="Last page"
          className={cn(
            'p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
            isDaylight
              ? 'border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950'
              : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
