import React, { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: string;
  trendPositive?: boolean;
  accentColor?: 'teal' | 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'sky';
  progress?: number;
  badgeText?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive = true,
  accentColor = 'teal',
  progress,
  badgeText,
  onClick,
  isActive = false,
}) => {
  const { isDaylight } = useTheme();

  const darkAccentBorders = {
    teal: 'border-slate-800 hover:border-teal-500/40 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
    amber: 'border-slate-800 hover:border-teal-500/40 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
    emerald: 'border-slate-800 hover:border-emerald-500/40 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
    blue: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
    purple: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
    rose: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
    sky: 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90 shadow-sm',
  };

  const daylightAccentBorders = {
    teal: 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-md shadow-sm',
    amber: 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-md shadow-sm',
    emerald: 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md shadow-sm',
    blue: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md shadow-sm',
    purple: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md shadow-sm',
    rose: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md shadow-sm',
    sky: 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md shadow-sm',
  };

  const darkIconColors = {
    teal: 'text-teal-300 bg-teal-500/10 border-teal-500/20',
    amber: 'text-teal-300 bg-teal-500/10 border-teal-500/20',
    emerald: 'text-emerald-400/90 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-slate-300 bg-slate-800/80 border-slate-700',
    purple: 'text-slate-300 bg-slate-800/80 border-slate-700',
    rose: 'text-slate-300 bg-slate-800/80 border-slate-700',
    sky: 'text-slate-300 bg-slate-800/80 border-slate-700',
  };

  const daylightIconColors = {
    teal: 'text-teal-800 bg-teal-50 border-teal-300',
    amber: 'text-teal-800 bg-teal-50 border-teal-300',
    emerald: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    blue: 'text-slate-700 bg-slate-100 border-slate-300',
    purple: 'text-slate-700 bg-slate-100 border-slate-300',
    rose: 'text-slate-700 bg-slate-100 border-slate-300',
    sky: 'text-slate-700 bg-slate-100 border-slate-300',
  };

  const progressColors = {
    teal: 'bg-teal-600',
    amber: 'bg-teal-600',
    emerald: 'bg-emerald-500',
    blue: 'bg-slate-500',
    purple: 'bg-slate-500',
    rose: 'bg-slate-500',
    sky: 'bg-slate-500',
  };

  const activeRing = isActive
    ? isDaylight
      ? 'ring-2 ring-teal-600 border-teal-600'
      : 'ring-1 ring-teal-500/40 border-teal-500/40 bg-slate-900/90'
    : '';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'group relative rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 backdrop-blur-sm select-none',
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : '',
        isDaylight ? daylightAccentBorders[accentColor] : darkAccentBorders[accentColor],
        activeRing,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p
              className={cn(
                'text-[10px] sm:text-xs font-black uppercase tracking-wider truncate',
                isDaylight ? 'text-slate-600' : 'text-slate-400',
              )}
            >
              {title}
            </p>
            {badgeText && (
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.2 rounded-full border uppercase tracking-wider',
                  isDaylight
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-800 text-slate-300 border-slate-700',
                )}
              >
                {badgeText}
              </span>
            )}
          </div>

          <div
            className={cn(
              'mt-1 text-xl sm:text-2xl font-black tracking-tight font-mono',
              isDaylight ? 'text-slate-950' : 'text-white',
            )}
          >
            {value}
          </div>

          {subtitle && (
            <p
              className={cn(
                'mt-0.5 text-[11px] font-semibold truncate',
                isDaylight ? 'text-slate-600' : 'text-slate-400',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={cn(
            'p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105',
            isDaylight ? daylightIconColors[accentColor] : darkIconColors[accentColor],
          )}
        >
          {icon}
        </div>
      </div>

      {/* Progress Bar (Optional) */}
      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="flex justify-between items-center text-[10px] mb-1 font-mono text-slate-500">
            <span>Capacity</span>
            <span className="font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progressColors[accentColor])}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Trend indicator (Optional) */}
      {trend && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.2 rounded-md',
              trendPositive
                ? isDaylight
                  ? 'text-emerald-800 bg-emerald-50 border border-emerald-300'
                  : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                : isDaylight
                  ? 'text-rose-800 bg-rose-50 border border-rose-300'
                  : 'text-rose-400 bg-rose-950/40 border border-rose-800/40',
            )}
          >
            {trendPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </span>
          <span className={cn('text-[10px]', isDaylight ? 'text-slate-500' : 'text-slate-400')}>vs last week</span>
        </div>
      )}
    </div>
  );
};
