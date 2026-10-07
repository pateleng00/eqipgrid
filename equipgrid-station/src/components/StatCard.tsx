import React, { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: string;
  trendPositive?: boolean;
  accentColor?: 'amber' | 'emerald' | 'blue' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive = true,
  accentColor = 'amber',
}) => {
  const { isDaylight } = useTheme();

  const darkAccentBorders = {
    amber: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 shadow-none',
    emerald: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 shadow-none',
    blue: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 shadow-none',
    purple: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 shadow-none',
  };

  const daylightAccentBorders = {
    amber: 'border-2 border-amber-300 bg-white hover:border-amber-400 shadow-sm',
    emerald: 'border-2 border-emerald-300 bg-white hover:border-emerald-400 shadow-sm',
    blue: 'border-2 border-blue-300 bg-white hover:border-blue-400 shadow-sm',
    purple: 'border-2 border-purple-300 bg-white hover:border-purple-400 shadow-sm',
  };

  const darkIconColors = {
    amber: 'text-slate-400 bg-slate-800/80 border-slate-700',
    emerald: 'text-slate-400 bg-slate-800/80 border-slate-700',
    blue: 'text-slate-400 bg-slate-800/80 border-slate-700',
    purple: 'text-slate-400 bg-slate-800/80 border-slate-700',
  };

  const daylightIconColors = {
    amber: 'text-amber-800 bg-amber-50/50 border border-amber-400',
    emerald: 'text-emerald-800 bg-emerald-50/50 border border-emerald-400',
    blue: 'text-blue-800 bg-blue-50/50 border border-blue-400',
    purple: 'text-purple-800 bg-purple-50/50 border border-purple-400',
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border p-3 sm:p-3.5 transition-all duration-200 shadow-sm',
        isDaylight ? daylightAccentBorders[accentColor] : darkAccentBorders[accentColor]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-[10px] sm:text-xs font-black uppercase tracking-wider", isDaylight ? "text-slate-950" : "text-slate-400")}>{title}</p>
          <div className={cn("mt-1 text-xl lg:text-2xl font-black tracking-tight", isDaylight ? "text-slate-950" : "text-white")}>{value}</div>
          {subtitle && <p className={cn("mt-0.5 text-[11px] font-semibold", isDaylight ? "text-slate-800" : "text-slate-400")}>{subtitle}</p>}
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border',
            isDaylight ? daylightIconColors[accentColor] : darkIconColors[accentColor]
          )}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span className={trendPositive ? (isDaylight ? 'text-emerald-800 font-black' : 'text-emerald-500 font-semibold') : (isDaylight ? 'text-rose-800 font-black' : 'text-rose-500 font-semibold')}>{trend}</span>
          <span className={isDaylight ? 'text-slate-700 font-medium' : 'text-slate-400'}>vs target baseline</span>
        </div>
      )}
    </div>
  );
};
