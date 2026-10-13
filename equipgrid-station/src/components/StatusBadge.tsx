import React from 'react';
import { getStatusColor, cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { getFarmerFriendlyStatus } from '../types';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showFarmerLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showFarmerLabel = false }) => {
  const { isDaylight } = useTheme();
  const color = getStatusColor(status, isDaylight);
  const farmerInfo = getFarmerFriendlyStatus(status);

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
      {showFarmerLabel ? (
        <span className="flex items-center gap-1">
          <span>{farmerInfo.farmerLabelEn}</span>
          <span className="opacity-75 text-[10px] font-normal">({farmerInfo.farmerLabelHi})</span>
        </span>
      ) : (
        status.replace(/_/g, ' ')
      )}
    </span>
  );
};
