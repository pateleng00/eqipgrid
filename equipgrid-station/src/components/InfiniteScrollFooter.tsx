import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { cn } from '../lib/utils';

export interface InfiniteScrollFooterProps {
  loadedCount: number;
  totalCount: number;
  onLoadMore?: () => void;
  itemName?: string;
  className?: string;
}

export const InfiniteScrollFooter: React.FC<InfiniteScrollFooterProps> = ({
  loadedCount,
  totalCount,
  onLoadMore,
  itemName = 'entries',
  className,
}) => {
  const { isDaylight } = useTheme();

  if (totalCount === 0) return null;

  const hasMore = loadedCount < totalCount;

  return (
    <div
      className={cn(
        'py-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs select-none border-t transition-colors',
        isDaylight
          ? 'border-slate-200 bg-slate-50/70 text-slate-700'
          : 'border-slate-800/80 bg-slate-950/60 text-slate-300',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-xs', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
          Showing <span className={cn('font-bold font-mono', isDaylight ? 'text-slate-950' : 'text-white')}>{loadedCount}</span> of{' '}
          <span className={cn('font-bold font-mono', isDaylight ? 'text-slate-950' : 'text-white')}>{totalCount}</span> {itemName}
        </span>
        {!hasMore && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
            <Check className="h-3 w-3" />
            All loaded
          </span>
        )}
      </div>

      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          className={cn(
            'px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs',
            isDaylight
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-400'
              : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white'
          )}
        >
          <span>Load More (+7)</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      )}
    </div>
  );
};
