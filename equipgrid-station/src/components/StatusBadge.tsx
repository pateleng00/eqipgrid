import React from 'react';
import { getStatusColor, cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { isDaylight } = useTheme();
  const color = getStatusColor(status, isDaylight);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border transition-colors',
        isDaylight ? 'font-bold' : 'font-medium',
        color.bg,
        color.text,
        color.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wide'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', color.dot)} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
