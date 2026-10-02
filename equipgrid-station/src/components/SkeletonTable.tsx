import React from 'react';
import { useTheme } from '../lib/ThemeContext';

interface SkeletonTableProps {
  columns: number;
  rows?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ columns, rows = 5 }) => {
  const { isDaylight } = useTheme();

  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Table header skeleton */}
      <div
        className={`h-10 rounded-lg flex items-center px-4 gap-4 ${
          isDaylight ? 'bg-slate-300/60' : 'bg-slate-800/60'
        }`}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={`h-3 rounded ${
              isDaylight ? 'bg-slate-400/70' : 'bg-slate-700/60'
            }`}
            style={{ width: `${Math.max(40, 100 - (i % 3) * 20)}px` }}
          />
        ))}
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`h-14 rounded-xl flex items-center px-4 gap-4 border transition-all ${
            isDaylight
              ? 'border-slate-300/80 bg-slate-200/30'
              : 'border-slate-800/80 bg-slate-900/30'
          }`}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className={`h-3.5 rounded ${
                isDaylight ? 'bg-slate-300' : 'bg-slate-800'
              }`}
              style={{
                width: c === 0 ? '120px' : c === 1 ? '160px' : `${Math.max(50, 90 - (c % 4) * 15)}px`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
