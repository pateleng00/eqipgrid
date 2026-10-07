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
  Layers,
  Lock,
  Eye,
  UserCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/AuthContext';

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

  // Guests get no sidebar at all — catalog fills the full width
  if (isGuest) return null;

  interface NavGroup {
    groupName: string;
    items: {
      id: string;
      label: string;
      icon: React.ReactNode;
    }[];
  }

  const navGroups: NavGroup[] = [
    {
      groupName: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    {
      groupName: 'FLEET OPERATIONS',
      items: [
        {
          id: 'locations',
          label: 'Locations',
          icon: <MapPin className="h-4 w-4" />,
        },
        {
          id: 'catalog',
          label: 'Assets',
          icon: <Truck className="h-4 w-4" />,
        },
        {
          id: 'rental-configs',
          label: 'Rentals',
          icon: <SlidersHorizontal className="h-4 w-4" />,
        },
      ],
    },
    {
      groupName: 'RENTAL WORKFLOW',
      items: [
        {
          id: 'booking',
          label: 'Deployments',
          icon: <CalendarCheck className="h-4 w-4" />,
        },
        {
          id: 'return',
          label: 'Returns',
          icon: <RotateCcw className="h-4 w-4" />,
        },
      ],
    },
    {
      groupName: 'FINANCE & DEALERS',
      items: [
        {
          id: 'dealers',
          label: 'Dealer',
          icon: <Users className="h-4 w-4" />,
        },
        {
          id: 'payments',
          label: 'Ledger',
          icon: <BookOpen className="h-4 w-4" />,
        },
        {
          id: 'cash',
          label: 'Reconciliation',
          icon: <BarChart3 className="h-4 w-4" />,
        },
      ],
    },
    ...((currentUser?.role === 'root' || currentUser?.role === 'admin' || currentUser?.role === 'manager')
      ? [
          {
            groupName: 'ACCESS CONTROL',
            items: [
              {
                id: 'users',
                label: 'Staff & Roles',
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
        'shrink-0 border-r p-3 flex flex-col justify-between hidden md:flex transition-all duration-300 select-none relative',
        isCollapsed ? 'w-20' : 'w-45',
        isDaylight
          ? 'border-slate-200 bg-white text-slate-950'
          : 'border-slate-800/80 bg-slate-950/60 text-slate-300'
      )}
    >
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        {/* Header & Collapse/Expand Toggle Button */}
        <div
          className={cn(
            "flex items-center pb-3 border-b",
            isDaylight ? "border-slate-200" : "border-slate-700/30",
            isCollapsed
              ? "justify-center"
              : "justify-between px-2"
          )}
        >
          {!isCollapsed && (
            <div className="px-2 text-lg font-black tracking-tight">
              EquipGrid
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "h-8 w-8 shrink-0 rounded-lg",
              "flex items-center justify-center",
              "border transition-all cursor-pointer",
              isDaylight
                ? "border-slate-300 hover:bg-slate-100 text-slate-950"
                : "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Guest Mode Banner */}
        {isGuest && !isCollapsed && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 border text-[11px] font-semibold',
              isDaylight
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-amber-900/20 border-amber-700/40 text-amber-400'
            )}
          >
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span>Guest Access — Browse Only</span>
          </div>
        )}
        {isGuest && isCollapsed && (
          <div
            className={cn(
              'flex justify-center py-1',
              isDaylight ? 'text-amber-600' : 'text-amber-500'
            )}
            title="Guest Access — Browse Only"
          >
            <Eye className="h-4 w-4" />
          </div>
        )}

        {/* Navigation items grouped with category headers */}
        <nav className="flex-1 overflow-y-auto pr-0.5 space-y-3">
          {navGroups.map((group, groupIdx) => (
            <div key={group.groupName} className="space-y-0.5">
              {/* Category Header */}
              {!isCollapsed ? (
                <div className={cn("px-2.5 pb-1", groupIdx === 0 ? "pt-0.5" : "pt-2")}>
                  <span
                    className={cn(
                      "text-[10px] font-extrabold uppercase tracking-wider block select-none",
                      isDaylight ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    {group.groupName}
                  </span>
                </div>
              ) : (
                groupIdx > 0 && <div className="my-1.5 border-t border-slate-700/40" />
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
                        title={
                          isCollapsed
                            ? `${item.label} — Staff login required`
                            : 'Staff login required'
                        }
                        className={cn(
                          'group flex w-full items-center rounded-xl relative cursor-not-allowed opacity-35',
                          isCollapsed
                            ? 'justify-center px-2 py-2'
                            : 'justify-start px-2.5 py-1.5 text-xs',
                          isDaylight
                            ? 'text-slate-500 border border-transparent'
                            : 'text-slate-600 border border-transparent'
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>

                        {!isCollapsed && (
                          <span className="ml-2.5 truncate flex-1">{item.label}</span>
                        )}

                        {!isCollapsed && (
                          <Lock
                            className={cn(
                              'h-3 w-3 shrink-0 ml-1',
                              isDaylight ? 'text-slate-400' : 'text-slate-600'
                            )}
                          />
                        )}

                        {isCollapsed && (
                          <div className="absolute left-full ml-2.5 hidden group-hover:flex z-50 whitespace-nowrap rounded-lg bg-[#2c2c2c] border border-slate-700 text-white text-xs px-2.5 py-1.5 shadow-xl font-bold items-center gap-1.5">
                            <Lock className="h-3 w-3 text-slate-400" />
                            {item.label}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      title={isCollapsed ? `${group.groupName}: ${item.label}` : undefined}
                      className={cn(
                        'group flex w-full items-center rounded-xl transition-all cursor-pointer relative overflow-hidden',
                        isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start px-3 py-2 text-xs',
                        isActive
                          ? isDaylight
                            ? 'bg-indigo-50/90 text-indigo-950 font-bold border border-indigo-200/80 shadow-xs'
                            : 'bg-indigo-950/40 text-indigo-300 font-bold border border-indigo-800/50 shadow-xs'
                          : isDaylight
                          ? 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 font-semibold border border-transparent'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 font-medium border border-transparent'
                      )}
                    >
                      {/* Active indicator bar on left edge like in reference image */}
                      {isActive && (
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-md',
                            isDaylight ? 'bg-indigo-600' : 'bg-indigo-500'
                          )}
                        />
                      )}

                      <span
                        className={cn(
                          'transition-colors shrink-0',
                          isActive
                            ? isDaylight
                              ? '!text-indigo-700'
                              : 'text-indigo-400'
                            : isDaylight
                            ? 'text-slate-500 group-hover:text-slate-700'
                            : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      >
                        {item.icon}
                      </span>

                      {!isCollapsed && (
                        <span
                          className={cn(
                            'ml-2.5 truncate',
                            isActive
                              ? isDaylight
                                ? 'font-extrabold !text-indigo-950'
                                : 'font-bold text-indigo-100'
                              : isDaylight
                              ? 'font-semibold text-slate-800'
                              : 'font-medium'
                          )}
                        >
                          {item.label}
                        </span>
                      )}

                      {/* Collapsed Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2.5 hidden group-hover:flex z-50 whitespace-nowrap rounded-lg bg-[#2c2c2c] border border-slate-700 text-white text-xs px-2.5 py-1.5 shadow-xl font-bold">
                          {item.label}
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

      {/* Footer Info Box */}
      {!isCollapsed ? (
        <div
          className={cn(
            'rounded-xl border p-3 text-[11px] space-y-1.5 transition-colors mt-3',
            isDaylight
              ? 'border-slate-200 bg-slate-50 text-slate-900'
              : 'border-slate-800/80 bg-slate-900/40 text-slate-400'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-1.5 font-black',
              isDaylight ? 'text-slate-950' : 'text-slate-300'
            )}
          >
            <Layers
              className={cn(
                'h-3.5 w-3.5',
                isDaylight ? 'text-amber-700' : 'text-slate-400'
              )}
            />
            <span>EquipGrid Enterprise</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
            <span className="truncate max-w-[120px]">
              {currentUser?.roleTitle || 'Operator'}
            </span>
            <span
              className={cn(
                'font-bold uppercase text-[9px] px-1 rounded border',
                isGuest
                  ? isDaylight
                    ? 'border-amber-400 text-amber-700 bg-amber-50'
                    : 'border-amber-600/50 text-amber-400 bg-amber-900/20'
                  : isDaylight
                    ? 'border-slate-300 text-slate-700'
                    : 'border-slate-700/60'
              )}
            >
              {isGuest ? 'GUEST' : currentUser?.role || 'user'}
            </span>
          </div>
          {isGuest && (
            <p
              className={cn(
                'text-[10px] pt-0.5 leading-snug',
                isDaylight ? 'text-amber-700' : 'text-amber-500/70'
              )}
            >
              Sign in for full station access.
            </p>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex justify-center py-2',
            isDaylight ? 'text-amber-700' : 'text-slate-400'
          )}
          title="EquipGrid Enterprise"
        >
          <Layers className="h-4 w-4" />
        </div>
      )}
    </aside>
  );
};
