import React, { useState } from 'react';
import {
  LayoutDashboard,
  Truck,
  CalendarCheck,
  Send,
  RotateCcw,
  BookOpen,
  Users,
  BarChart3,
  MapPin,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/AuthContext';
import { api } from '../services/api';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Tabs accessible to guest users (no login required)
const GUEST_ALLOWED_TABS = ['catalog'];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isGuest = currentUser?.role === 'guest';

  // Live counts for badges
  const bookings = api.bookings || [];
  const assets = api.assets || [];
  const activeDeploymentsCount = bookings.filter((b) => b.status === 'ON_RENT' || b.status === 'DISPATCHED').length;
  const pendingDispatchCount = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY',
  ).length;
  const maintenanceCount = assets.filter(
    (a) => a.status === 'MAINTENANCE' || a.status === 'INSPECTION' || a.status === 'DAMAGED',
  ).length;

  // Guests get no sidebar at all — catalog fills the full width
  if (isGuest) return null;

  interface NavGroup {
    groupName: string;
    items: {
      id: string;
      label: string;
      hindiLabel?: string;
      icon: React.ReactNode;
      badgeCount?: number;
      isNew?: boolean;
    }[];
  }

  const navGroups: NavGroup[] = [
    {
      groupName: 'MAIN MENU (मुख्य मेनू)',
      items: [
        {
          id: 'dashboard',
          label: "Today's Work",
          hindiLabel: 'आज का काम',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    {
      groupName: 'MACHINES & RATES (मशीनें व दरें)',
      items: [
        {
          id: 'catalog',
          label: 'All Machines',
          hindiLabel: 'सभी मशीनें',
          icon: <Truck className="h-4 w-4" />,
        },
        {
          id: 'maintenance',
          label: 'Repairs & Service',
          hindiLabel: 'मरम्मत व सर्विस',
          icon: <Wrench className="h-4 w-4" />,
          badgeCount: maintenanceCount > 0 ? maintenanceCount : undefined,
          isNew: true,
        },
        {
          id: 'rental-configs',
          label: 'Rental Rates',
          hindiLabel: 'किराया दरें',
          icon: <SlidersHorizontal className="h-4 w-4" />,
        },
        {
          id: 'locations',
          label: 'Hub Locations',
          hindiLabel: 'स्टेशन व केंद्र',
          icon: <MapPin className="h-4 w-4" />,
        },
      ],
    },
    {
      groupName: 'DAILY WORK (दैनिक कार्य)',
      items: [
        {
          id: 'booking',
          label: 'Bookings & Orders',
          hindiLabel: 'बुकिंग व ग्राहक',
          icon: <CalendarCheck className="h-4 w-4" />,
          badgeCount: activeDeploymentsCount > 0 ? activeDeploymentsCount : undefined,
        },
        {
          id: 'dispatch',
          label: 'Send Machine',
          hindiLabel: 'मशीन भेजना',
          icon: <Send className="h-4 w-4" />,
          badgeCount: pendingDispatchCount > 0 ? pendingDispatchCount : undefined,
        },
        {
          id: 'return',
          label: 'Receive Return',
          hindiLabel: 'वापसी व रिफंड',
          icon: <RotateCcw className="h-4 w-4" />,
        },
      ],
    },
    {
      groupName: 'PAYMENTS & CASH (रुपये और हिसाब)',
      items: [
        {
          id: 'payments',
          label: 'Payment History',
          hindiLabel: 'भुगतान रिकॉर्ड',
          icon: <BookOpen className="h-4 w-4" />,
        },
        {
          id: 'cash',
          label: 'Daily Cash Register',
          hindiLabel: 'नकद हिसाब',
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          id: 'dealers',
          label: 'Partner Dealers',
          hindiLabel: 'डीलर साथी',
          icon: <Users className="h-4 w-4" />,
        },
      ],
    },
    ...(currentUser?.role === 'root' || currentUser?.role === 'admin' || currentUser?.role === 'manager'
      ? [
          {
            groupName: 'STAFF (स्टाफ सदस्य)',
            items: [
              {
                id: 'users',
                label: 'Staff Users',
                hindiLabel: 'स्टाफ सदस्य',
                icon: <UserCheck className="h-4 w-4" />,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        'shrink-0 border-r p-2.5 flex flex-col justify-between hidden md:flex transition-all duration-300 select-none relative z-30',
        isCollapsed ? 'w-20' : 'w-56',
        isDaylight
          ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
          : 'border-slate-800/80 bg-slate-950/70 text-slate-300',
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        {/* Header & Collapse/Expand Toggle Button */}
        <div
          className={cn(
            'flex items-center pb-2.5 border-b',
            isDaylight ? 'border-slate-200' : 'border-slate-800/80',
            isCollapsed ? 'justify-center' : 'justify-between px-2',
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-teal-700">STATION DESK</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'group relative h-7 w-7 shrink-0 rounded-lg',
              'flex items-center justify-center',
              'border transition-all cursor-pointer',
              isDaylight
                ? 'border-slate-300 hover:bg-slate-100 text-slate-700'
                : 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white',
            )}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Navigation items grouped with category headers */}
        <nav className={cn('flex-1 pr-0.5 space-y-3', isCollapsed ? 'overflow-visible' : 'overflow-y-auto')}>
          {navGroups.map((group, groupIdx) => (
            <div key={group.groupName} className="space-y-0.5">
              {/* Category Header */}
              {!isCollapsed ? (
                <div className={cn('px-2.5 pb-1', groupIdx === 0 ? 'pt-0.5' : 'pt-2')}>
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-wider block select-none',
                      isDaylight ? 'text-slate-400 font-extrabold' : 'text-slate-500',
                    )}
                  >
                    {group.groupName}
                  </span>
                </div>
              ) : (
                groupIdx > 0 && <div className="my-1.5 border-t border-slate-800/80" />
              )}

              {/* Items in Group */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const isLocked = isGuest && !GUEST_ALLOWED_TABS.includes(item.id);

                  if (isLocked) {
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'group flex w-full items-center rounded-xl relative cursor-not-allowed opacity-35',
                          isCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-2.5 py-1.5 text-xs',
                          isDaylight
                            ? 'text-slate-500 border border-transparent'
                            : 'text-slate-600 border border-transparent',
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>

                        {!isCollapsed && <span className="ml-2.5 truncate flex-1">{item.label}</span>}

                        {!isCollapsed && (
                          <Lock
                            className={cn('h-3 w-3 shrink-0 ml-1', isDaylight ? 'text-slate-400' : 'text-slate-600')}
                          />
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        'group flex w-full items-center rounded-xl transition-all cursor-pointer relative',
                        isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start px-2.5 py-2 text-xs',
                        isActive
                          ? 'bg-teal-50 text-teal-950 font-black border border-teal-300 shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-semibold border border-transparent',
                      )}
                    >
                      {/* Active indicator bar on left edge */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-md bg-teal-700" />
                      )}

                      <span
                        className={cn(
                          'transition-colors shrink-0',
                          isActive ? 'text-teal-700' : 'text-slate-500 group-hover:text-slate-800',
                        )}
                      >
                        {item.icon}
                      </span>

                      {!isCollapsed && (
                        <div className="ml-2.5 truncate flex-1 text-left">
                          <span
                            className={cn(
                              'block leading-tight',
                              isActive ? 'font-black text-teal-950' : 'font-semibold text-slate-800',
                            )}
                          >
                            {item.label}
                          </span>
                          {item.hindiLabel && (
                            <span className="text-[10px] text-slate-400 block leading-tight">{item.hindiLabel}</span>
                          )}
                        </div>
                      )}

                      {/* Badge count or NEW pill */}
                      {!isCollapsed && (
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {typeof item.badgeCount === 'number' && (
                            <span
                              className={cn(
                                'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border',
                                isActive
                                  ? 'bg-teal-100 text-teal-900 border-teal-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 border-slate-200',
                              )}
                            >
                              {item.badgeCount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tooltip for Collapsed Sidebar */}
                      {isCollapsed && (
                        <div
                          className={cn(
                            'absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-[100] pointer-events-none',
                            'hidden group-hover:flex items-center gap-1.5',
                            'whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xl border',
                            isDaylight
                              ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30'
                              : 'bg-[#222222] text-slate-100 border-slate-700/80 shadow-black/50',
                          )}
                        >
                          <span>{item.label}</span>
                          {item.hindiLabel && <span className="opacity-75 text-[10px]">({item.hindiLabel})</span>}
                          {item.isNew && (
                            <span className="text-[9px] font-mono font-black px-1 rounded bg-emerald-500 text-slate-950">
                              NEW
                            </span>
                          )}
                          {typeof item.badgeCount === 'number' && (
                            <span className="text-[10px] font-mono font-bold px-1.5 rounded-full bg-amber-500 text-slate-950">
                              {item.badgeCount}
                            </span>
                          )}
                          <span
                            className={cn(
                              'absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent',
                              isDaylight ? 'border-r-slate-900' : 'border-r-[#222222]',
                            )}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};
