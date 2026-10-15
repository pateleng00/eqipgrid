import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, AlertTriangle, Wrench, ShieldAlert, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../services/api';
import { cn } from '../lib/utils';

interface NotificationItem {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  timeAgo: string;
  tab: string;
  read: boolean;
}

interface NotificationsPopoverProps {
  onNavigate: (tab: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ onNavigate }) => {
  const { isDaylight } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  const TODAY = new Date().toISOString().split('T')[0];

  // Dynamically compute notifications with simple plain language
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];
    const bookings = api.bookings || [];
    const assets = api.assets || [];

    // 1. Overdue returns
    const overdue = bookings.filter((b) => b.status === 'ON_RENT' && b.endDate < TODAY);
    overdue.forEach((b) => {
      list.push({
        id: `overdue-${b.id}`,
        type: 'urgent',
        title: `Machine Return Overdue (मशीन वापसी में देरी): ${b.asset.name}`,
        description: `Customer ${b.customer.fullName} was due to return on ${b.endDate}. Please call customer or check return status.`,
        timeAgo: 'Overdue',
        tab: 'return',
        read: readIds.has(`overdue-${b.id}`),
      });
    });

    // 2. Pending dispatches scheduled for today
    const readyDispatches = bookings.filter(
      (b) => (b.status === 'CONFIRMED' || b.status === 'DISPATCH_READY') && b.startDate <= TODAY,
    );
    if (readyDispatches.length > 0) {
      list.push({
        id: `dispatch-today`,
        type: 'warning',
        title: `${readyDispatches.length} Machines to Send Today (आज मशीनें भेजनी हैं)`,
        description: `Check machine condition and complete delivery receipt before handing over to farmer.`,
        timeAgo: 'Today',
        tab: 'dispatch',
        read: readIds.has(`dispatch-today`),
      });
    }

    // 3. Equipment in maintenance / repair
    const underMaint = assets.filter(
      (a) => a.status === 'MAINTENANCE' || a.status === 'INSPECTION' || a.status === 'DAMAGED',
    );
    if (underMaint.length > 0) {
      list.push({
        id: `maint-needed`,
        type: 'info',
        title: `${underMaint.length} Machines in Repair Shed (मरम्मत शेड में)`,
        description: `${underMaint
          .map((a) => a.assetTag)
          .slice(0, 3)
          .join(', ')} need oil change or servicing before renting out.`,
        timeAgo: 'Under Repair',
        tab: 'maintenance',
        read: readIds.has(`maint-needed`),
      });
    }

    // 4. Deposit collection requirement
    const missingDeposits = bookings.filter((b) => b.status === 'CONFIRMED' && (b.depositPaid || 0) <= 0);
    if (missingDeposits.length > 0) {
      list.push({
        id: `deposits-pending`,
        type: 'warning',
        title: `${missingDeposits.length} Bookings Pending Deposit (सिक्योरिटी बाकी है)`,
        description: `Take security deposit by UPI or cash before releasing machine from yard.`,
        timeAgo: 'Pending',
        tab: 'payments',
        read: readIds.has(`deposits-pending`),
      });
    }

    // Default status if no alerts
    if (list.length === 0) {
      list.push({
        id: `sys-ready`,
        type: 'success',
        title: 'All Good in Yard (सब कुछ सामान्य है)',
        description: 'No pending alerts. All machines are accounted for.',
        timeAgo: 'Just now',
        tab: 'dashboard',
        read: false,
      });
    }

    return list;
  }, [readIds, TODAY]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Alerts"
        title="Alerts & Reminders (सूचनाएं)"
        className={cn(
          'relative h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border select-none',
          isDaylight
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80',
          isOpen
            ? isDaylight
              ? 'ring-2 ring-amber-500/30 border-amber-500'
              : 'ring-2 ring-amber-500/40 border-amber-500/60'
            : '',
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm ring-2 ring-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150',
            isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100',
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'px-4 py-3 border-b flex items-center justify-between',
              isDaylight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs sm:text-sm">Alerts & Reminders (सूचनाएं)</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setReadIds((prev) => new Set([...prev, item.id]));
                  setIsOpen(false);
                  onNavigate(item.tab);
                }}
                className={cn(
                  'p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none text-xs group',
                  item.read
                    ? isDaylight
                      ? 'bg-white hover:bg-slate-50 text-slate-600'
                      : 'bg-slate-900 hover:bg-slate-800/40 text-slate-400'
                    : isDaylight
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 text-slate-950'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-100',
                )}
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs truncate group-hover:text-amber-500 transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">{item.timeAgo}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed line-clamp-2 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className={cn(
              'px-4 py-2 border-t text-center text-[11px] font-bold cursor-pointer',
              isDaylight
                ? 'border-slate-100 bg-slate-50 text-amber-700 hover:bg-amber-50'
                : 'border-slate-800 bg-slate-950/60 text-amber-400 hover:bg-slate-800',
            )}
            onClick={() => {
              setIsOpen(false);
              onNavigate('dashboard');
            }}
          >
            Open Today's Work Desk (आज का काम देखें) →
          </div>
        </div>
      )}
    </div>
  );
};
