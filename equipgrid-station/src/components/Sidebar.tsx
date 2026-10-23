import React, { useState, useEffect, useRef } from 'react';
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
  UserCheck,
  Wrench,
  Headphones,
  TrendingUp,
  Wallet,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/AuthContext';
import { api } from '../services/api';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavSubItem {
  id: string;
  label: string;
  hindiLabel: string;
  icon: React.ReactNode;
  badgeCount?: number;
  isNew?: boolean;
}

interface NavGroupItem {
  id: string;
  type: 'single' | 'group';
  label: string;
  hindiLabel: string;
  icon: React.ReactNode;
  badgeCount?: number;
  subItems?: NavSubItem[];
}

interface NavSection {
  sectionTitle: string;
  items: NavGroupItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Flyout state (opened by hover OR click)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const flyoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const tickets = api.supportTickets || [];
  const openTicketsCount = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_DISCUSSION' || t.status === 'IN_PROGRESS',
  ).length;
  const dealerLeads = api.dealerLeads || [];
  const newLeadsCount = dealerLeads.filter((l) => l.status === 'ENQUIRY').length;

  // Clean up flyout timer on unmount
  useEffect(() => {
    return () => {
      if (flyoutCloseTimerRef.current) clearTimeout(flyoutCloseTimerRef.current);
    };
  }, []);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(target) &&
        sidebarRef.current &&
        !sidebarRef.current.contains(target)
      ) {
        setOpenGroupId(null);
        setIsPinned(false);
        setFlyoutPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isGuest) return null;

  // Navigation structure
  const navSections: NavSection[] = [
    {
      sectionTitle: 'MAIN MENU (मुख्य मेनू)',
      items: [
        {
          id: 'dashboard',
          type: 'single',
          label: "Today's Work",
          hindiLabel: 'आज का काम',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    {
      sectionTitle: 'MANAGEMENT (प्रबंधन)',
      items: [
        {
          id: 'management',
          type: 'group',
          label: 'Management',
          hindiLabel: 'प्रबंधन व यार्ड',
          icon: <Layers className="h-4 w-4" />,
          badgeCount: maintenanceCount > 0 ? maintenanceCount : undefined,
          subItems: [
            {
              id: 'catalog',
              label: 'All Machines',
              hindiLabel: 'सभी मशीनें',
              icon: <Truck className="h-4 w-4" />,
            },
            {
              id: 'locations',
              label: 'Hub Locations',
              hindiLabel: 'स्टेशन व केंद्र',
              icon: <MapPin className="h-4 w-4" />,
            },
            {
              id: 'maintenance',
              label: 'Repairs & Service',
              hindiLabel: 'मरम्मत व सर्विस',
              icon: <Wrench className="h-4 w-4" />,
              badgeCount: maintenanceCount > 0 ? maintenanceCount : undefined,
            },
            {
              id: 'rental-configs',
              label: 'Rental Rates',
              hindiLabel: 'किराया दरें',
              icon: <SlidersHorizontal className="h-4 w-4" />,
            },
            {
              id: 'dealers',
              label: 'Partner Dealers',
              hindiLabel: 'डीलर साथी (6% कमीशन)',
              icon: <Users className="h-4 w-4" />,
            },
          ],
        },
      ],
    },
    {
      sectionTitle: 'OPERATIONS (दैनिक कार्य)',
      items: [
        {
          id: 'operations',
          type: 'group',
          label: 'Daily Operations',
          hindiLabel: 'दैनिक कार्य',
          icon: <CalendarCheck className="h-4 w-4" />,
          badgeCount:
            activeDeploymentsCount + pendingDispatchCount > 0
              ? activeDeploymentsCount + pendingDispatchCount
              : undefined,
          subItems: [
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
      ],
    },
    {
      sectionTitle: 'LEADS & INQUIRIES (पूछताछ व लीड्स)',
      items: [
        {
          id: 'leads_inquiries',
          type: 'group',
          label: 'Inquiries & Leads',
          hindiLabel: 'पूछताछ व लीड्स',
          icon: <Headphones className="h-4 w-4" />,
          badgeCount: openTicketsCount + newLeadsCount > 0 ? openTicketsCount + newLeadsCount : undefined,
          subItems: [
            {
              id: 'support',
              label: 'Customer Inquiries',
              hindiLabel: 'ग्राहक पूछताछ व टिकट',
              icon: <Headphones className="h-4 w-4" />,
              badgeCount: openTicketsCount > 0 ? openTicketsCount : undefined,
            },
            {
              id: 'leads',
              label: 'Host Fleet Leads',
              hindiLabel: 'मशीन मालिक लीड्स',
              icon: <TrendingUp className="h-4 w-4" />,
              badgeCount: newLeadsCount > 0 ? newLeadsCount : undefined,
            },
          ],
        },
      ],
    },
    {
      sectionTitle: 'FINANCE & ACCOUNTS (रुपये और हिसाब)',
      items: [
        {
          id: 'finance',
          type: 'group',
          label: 'Finance & Accounts',
          hindiLabel: 'रुपये और हिसाब',
          icon: <Wallet className="h-4 w-4" />,
          subItems: [
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
              icon: <Wallet className="h-4 w-4" />,
            },
          ],
        },
      ],
    },
    {
      sectionTitle: 'REPORTS & ANALYTICS (रिपोर्ट्स व विश्लेषण)',
      items: [
        {
          id: 'reporting',
          type: 'single',
          label: 'Reports & Analytics',
          hindiLabel: 'रिपोर्ट्स व विश्लेषण',
          icon: <BarChart3 className="h-4 w-4" />,
        },
      ],
    },
    ...(currentUser?.role === 'root' || currentUser?.role === 'admin' || currentUser?.role === 'manager'
      ? [
          {
            sectionTitle: 'STAFF & ROLES (स्टाफ सदस्य)',
            items: [
              {
                id: 'users',
                type: 'single' as const,
                label: 'Staff Users',
                hindiLabel: 'स्टाफ सदस्य',
                icon: <UserCheck className="h-4 w-4" />,
              },
            ],
          },
        ]
      : []),
  ];

  // Helper to check if a group contains the active tab
  const isGroupActive = (item: NavGroupItem) => {
    if (item.type === 'single') return activeTab === item.id;
    return item.subItems?.some((sub) => sub.id === activeTab) || false;
  };

  // Flyout trigger handlers: both hover and click
  const handleGroupClick = (e: React.MouseEvent<HTMLElement>, groupId: string) => {
    e.stopPropagation();
    if (openGroupId === groupId && isPinned) {
      // Toggle off if already pinned open
      setOpenGroupId(null);
      setIsPinned(false);
      setFlyoutPosition(null);
    } else {
      // Pin open
      const rect = e.currentTarget.getBoundingClientRect();
      setFlyoutPosition({
        top: Math.max(12, rect.top - 6),
        left: rect.right + 6,
      });
      setOpenGroupId(groupId);
      setIsPinned(true);
    }
  };

  const handleGroupMouseEnter = (e: React.MouseEvent<HTMLElement>, groupId: string) => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyoutPosition({
      top: Math.max(12, rect.top - 6),
      left: rect.right + 6,
    });
    setOpenGroupId(groupId);
  };

  const handleGroupMouseLeave = () => {
    if (isPinned) return; // Stays open if locked by click
    flyoutCloseTimerRef.current = setTimeout(() => {
      setOpenGroupId(null);
      setFlyoutPosition(null);
    }, 200);
  };

  const handleFlyoutMouseEnter = () => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
  };

  const handleFlyoutMouseLeave = () => {
    if (isPinned) return; // Stays open if locked by click
    flyoutCloseTimerRef.current = setTimeout(() => {
      setOpenGroupId(null);
      setFlyoutPosition(null);
    }, 200);
  };

  // Find currently active flyout group object
  const activeFlyoutGroup = React.useMemo(() => {
    if (!openGroupId) return null;
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.id === openGroupId && item.type === 'group') {
          return item;
        }
      }
    }
    return null;
  }, [openGroupId, navSections]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          'shrink-0 border-r p-2 flex flex-col justify-between hidden md:flex transition-all duration-300 select-none relative z-30',
          isCollapsed ? 'w-16' : 'w-60',
          isDaylight
            ? 'border-[#E2E8F0] bg-white text-[#1E293B] shadow-xs'
            : 'border-slate-800/80 bg-slate-950 text-slate-300',
        )}
      >
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          {/* Header & Collapse/Expand Toggle Button */}
          <div
            className={cn(
              'flex items-center pb-2.5 border-b',
              isDaylight ? 'border-[#E2E8F0]' : 'border-slate-800/80',
              isCollapsed ? 'justify-center' : 'justify-between px-2',
            )}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-wider uppercase text-[#0D5C46]">STATION DESK</span>
              </div>
            )}

            <button
              onClick={() => {
                setIsCollapsed(!isCollapsed);
                setOpenGroupId(null);
                setIsPinned(false);
              }}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'group relative h-7 w-7 shrink-0 rounded-lg',
                'flex items-center justify-center',
                'border transition-all cursor-pointer',
                isDaylight
                  ? 'border-[#E2E8F0] hover:bg-slate-100 text-[#1E293B]'
                  : 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white',
              )}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Navigation Items List — clean, compact, no inner expanding subtabs */}
          <nav className={cn('flex-1 pr-0.5 space-y-3', isCollapsed ? 'overflow-visible' : 'overflow-y-auto')}>
            {navSections.map((section, sIdx) => (
              <div key={section.sectionTitle} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className={cn('px-2 pb-0.5', sIdx === 0 ? 'pt-0.5' : 'pt-1.5')}>
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase tracking-wider block select-none',
                        isDaylight ? 'text-[#64748B]' : 'text-slate-500',
                      )}
                    >
                      {section.sectionTitle}
                    </span>
                  </div>
                ) : (
                  sIdx > 0 && <div className="my-1.5 border-t border-[#E2E8F0] dark:border-slate-800" />
                )}

                {/* Items in Section */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isGroupActive(item);
                    const isOpen = openGroupId === item.id;

                    // ==========================================
                    // 1. SINGLE TAB (Dashboard, Reporting, Users)
                    // ==========================================
                    if (item.type === 'single') {
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange(item.id);
                            setOpenGroupId(null);
                            setIsPinned(false);
                          }}
                          className={cn(
                            'group flex w-full items-center rounded-xl transition-all cursor-pointer relative',
                            isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start px-2.5 py-2 text-xs',
                            active
                              ? isDaylight
                                ? 'bg-[#0D5C46]/8 text-[#0D5C46] font-black border border-[#0D5C46]/20'
                                : 'bg-[#0D5C46]/20 text-emerald-400 font-black border border-[#0D5C46]/40'
                              : isDaylight
                              ? 'text-[#1E293B] hover:bg-slate-100 hover:text-[#1E293B] font-semibold border border-transparent'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white font-semibold border border-transparent',
                          )}
                        >
                          {/* Active indicator bar on left edge */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-md bg-[#0D5C46]" />
                          )}

                          <span
                            className={cn(
                              'transition-colors shrink-0',
                              active ? 'text-[#0D5C46]' : 'text-[#64748B] group-hover:text-[#1E293B]',
                            )}
                          >
                            {item.icon}
                          </span>

                          {!isCollapsed && (
                            <div className="ml-2.5 truncate flex-1 text-left">
                              <span
                                className={cn(
                                  'block leading-tight text-xs',
                                  active ? 'font-black text-[#0D5C46]' : 'font-semibold text-[#1E293B] dark:text-slate-200',
                                )}
                              >
                                {item.label}
                              </span>
                              <span className="text-[10px] text-[#64748B] block leading-tight">{item.hindiLabel}</span>
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
                                  ? 'bg-[#1E293B] text-white border-slate-700 shadow-slate-900/30'
                                  : 'bg-slate-900 text-white border-slate-700',
                              )}
                            >
                              <span>{item.label}</span>
                              <span className="opacity-75 text-[10px]">({item.hindiLabel})</span>
                            </div>
                          )}
                        </button>
                      );
                    }

                    // ==========================================
                    // 2. GROUP TAB (Flyout on both Hover & Click)
                    // ==========================================
                    return (
                      <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={(e) => handleGroupMouseEnter(e, item.id)}
                        onMouseLeave={handleGroupMouseLeave}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleGroupClick(e, item.id)}
                          className={cn(
                            'group flex w-full items-center rounded-xl transition-all cursor-pointer relative',
                            isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-start px-2.5 py-2 text-xs',
                            isOpen
                              ? isDaylight
                                ? 'bg-[#0D5C46]/10 text-[#0D5C46] font-bold border border-[#0D5C46]/30 shadow-xs'
                                : 'bg-[#0D5C46]/25 text-emerald-300 font-bold border border-[#0D5C46]/40 shadow-xs'
                              : active
                              ? isDaylight
                                ? 'bg-[#0D5C46]/5 text-[#0D5C46] border border-[#0D5C46]/20'
                                : 'bg-[#0D5C46]/15 text-emerald-400 border border-[#0D5C46]/30'
                              : isDaylight
                              ? 'text-[#1E293B] hover:bg-slate-100 hover:text-[#1E293B] border border-transparent'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent',
                          )}
                        >
                          {/* Active indicator bar on left edge if child active or flyout open */}
                          {(active || isOpen) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-md bg-[#0D5C46]" />
                          )}

                          <span
                            className={cn(
                              'transition-colors shrink-0',
                              active || isOpen ? 'text-[#0D5C46]' : 'text-[#64748B] group-hover:text-[#1E293B]',
                            )}
                          >
                            {item.icon}
                          </span>

                          {!isCollapsed && (
                            <>
                              <div className="ml-2.5 truncate flex-1 text-left">
                                <span
                                  className={cn(
                                    'block leading-tight text-xs',
                                    active || isOpen
                                      ? 'font-black text-[#0D5C46]'
                                      : 'font-bold text-[#1E293B] dark:text-slate-200',
                                  )}
                                >
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-[#64748B] block leading-tight">
                                  {item.hindiLabel}
                                </span>
                              </div>

                              {/* Badge Count */}
                              {typeof item.badgeCount === 'number' && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border bg-[#F1F5F9] text-[#334155] border-[#E2E8F0] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shrink-0 mr-1">
                                  {item.badgeCount}
                                </span>
                              )}

                              {/* Right Chevron indicating flyout panel */}
                              <span
                                className={cn(
                                  'shrink-0 ml-1 transition-transform',
                                  isOpen ? 'text-[#0D5C46] translate-x-0.5' : 'text-[#64748B]',
                                )}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* =========================================================================
          HOVER & CLICK FLYOUT PANEL (Clean Floating Menu to Right as in Image 2)
          ========================================================================= */}
      {activeFlyoutGroup && flyoutPosition && activeFlyoutGroup.subItems && (
        <div
          ref={flyoutRef}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
          style={{
            top: `${flyoutPosition.top}px`,
            left: `${flyoutPosition.left}px`,
          }}
          className={cn(
            'fixed z-50 w-72 rounded-2xl border shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150',
            isDaylight
              ? 'bg-white border-[#E2E8F0] text-[#1E293B] shadow-slate-900/15'
              : 'bg-slate-900 border-slate-700 text-white shadow-black/60',
          )}
        >
          {/* Flyout Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-2 mb-2">
            <div>
              <span className="text-xs font-black text-[#1E293B] dark:text-white flex items-center gap-1.5">
                <span className="text-[#0D5C46]">{activeFlyoutGroup.icon}</span>
                {activeFlyoutGroup.label}
              </span>
              <span className="text-[10px] text-[#64748B] block">{activeFlyoutGroup.hindiLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              {isPinned && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Pinned
                </span>
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#334155] dark:bg-slate-800 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700">
                Select Tab
              </span>
            </div>
          </div>

          {/* Sub-items list inside flyout */}
          <div className="space-y-1">
            {activeFlyoutGroup.subItems.map((sub) => {
              const isSubActive = activeTab === sub.id;

              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    onTabChange(sub.id);
                    setOpenGroupId(null);
                    setIsPinned(false);
                    setFlyoutPosition(null);
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer',
                    isSubActive
                      ? 'bg-[#0D5C46]/10 text-[#0D5C46] font-black border border-[#0D5C46]/30'
                      : isDaylight
                      ? 'hover:bg-slate-50 text-[#1E293B] border border-transparent'
                      : 'hover:bg-slate-800/70 text-slate-200 border border-transparent',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'p-1.5 rounded-lg shrink-0 transition-colors',
                        isSubActive
                          ? 'bg-[#0D5C46] text-white'
                          : isDaylight
                          ? 'bg-slate-100 text-[#64748B] group-hover:text-[#1E293B] group-hover:bg-slate-200/80'
                          : 'bg-slate-800 text-slate-400 group-hover:text-white',
                      )}
                    >
                      {sub.icon}
                    </div>
                    <div className="truncate">
                      <div
                        className={cn(
                          'text-xs leading-tight',
                          isSubActive ? 'font-black text-[#0D5C46]' : 'font-bold text-[#1E293B] dark:text-white',
                        )}
                      >
                        {sub.label}
                      </div>
                      <div className="text-[10px] text-[#64748B] leading-tight mt-0.5">{sub.hindiLabel}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {typeof sub.badgeCount === 'number' && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border bg-[#F1F5F9] text-[#334155] border-[#E2E8F0] dark:bg-slate-800 dark:text-slate-300">
                        {sub.badgeCount}
                      </span>
                    )}
                    <ArrowRight className="h-3 w-3 text-[#64748B] opacity-40 group-hover:opacity-100 group-hover:text-[#0D5C46] transition-all transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
