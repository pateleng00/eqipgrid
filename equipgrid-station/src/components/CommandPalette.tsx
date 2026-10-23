import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  MapPin,
  Truck,
  Wrench,
  CalendarCheck,
  Send,
  RotateCcw,
  BookOpen,
  BarChart3,
  Users,
  UserCheck,
  SlidersHorizontal,
  Sun,
  Moon,
  Zap,
  ArrowRight,
  X,
  CornerDownLeft,
  Sparkles,
  ChevronRight,
  Compass,
  Headphones,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/AuthContext';
import { formatINR, cn } from '../lib/utils';
import { Asset } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onNewDeployment?: () => void;
  onSelectAsset?: (asset: Asset) => void;
}

type PaletteCategory = 'all' | 'action' | 'asset' | 'booking' | 'navigation';

interface PaletteItem {
  id: string;
  type: 'action' | 'asset' | 'booking' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  imageUrl?: string;
  badge?: string;
  badgeColor?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onNewDeployment,
  onSelectAsset,
}) => {
  const { isDaylight, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  const isGuest = currentUser?.role === 'guest';

  // Subscribe to live api store updates while open
  useEffect(() => {
    if (isOpen) {
      return api.subscribe(() => setTick((t) => t + 1));
    }
  }, [isOpen]);

  // Focus input when opened and reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Quick Action items
  const actionItems: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];

    if (!isGuest && onNewDeployment) {
      list.push({
        id: 'act-new-deploy',
        type: 'action',
        title: 'New Booking (नई बुकिंग)',
        subtitle: 'Create a rental booking for walk-in or calling farmer',
        icon: <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        badge: 'ACTION',
        badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        action: () => {
          onNewDeployment();
          onClose();
        },
      });
    }
    return list;
  }, [isDaylight, toggleTheme, isGuest, onNewDeployment, onClose]);

  // Base navigation pages
  const navItems: PaletteItem[] = useMemo(() => {
    if (isGuest) {
      return [
        {
          id: 'nav-catalog',
          type: 'navigation',
          title: 'All Machines (सभी मशीनें)',
          subtitle: 'Browse all agricultural & construction equipment fleet',
          icon: <Truck className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
          badge: 'VIEW',
          action: () => {
            onNavigate('catalog');
            onClose();
          },
        },
      ];
    }

    const items: PaletteItem[] = [
      {
        id: 'nav-dashboard',
        type: 'navigation',
        title: "Today's Work (आज का काम – Dashboard)",
        subtitle: 'View today’s bookings, machines on rent, and cash collected',
        icon: <LayoutDashboard className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        badge: 'STATION',
        action: () => {
          onNavigate('dashboard');
          onClose();
        },
      },
      {
        id: 'nav-catalog',
        type: 'navigation',
        title: 'All Machines (सभी मशीनें)',
        subtitle: 'Machinery catalog, serial numbers, models, and daily rental rates',
        icon: <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
        badge: 'FLEET',
        action: () => {
          onNavigate('catalog');
          onClose();
        },
      },
      {
        id: 'nav-booking',
        type: 'navigation',
        title: 'Bookings & Orders (बुकिंग व ग्राहक)',
        subtitle: 'Customer bookings, Aadhaar verification, and advance deposits',
        icon: <CalendarCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
        badge: 'DESK',
        action: () => {
          onNavigate('booking');
          onClose();
        },
      },
      {
        id: 'nav-dispatch',
        type: 'navigation',
        title: 'Send Machine Out (मशीन भेजना – Dispatch)',
        subtitle: 'Machine handover checklist, odometer reading, and gate pass',
        icon: <Send className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
        badge: 'YARD',
        action: () => {
          onNavigate('dispatch');
          onClose();
        },
      },
      {
        id: 'nav-return',
        type: 'navigation',
        title: 'Receive Machine Return (वापसी व रिफंड)',
        subtitle: 'Return inspection, damage check, and deposit refund',
        icon: <RotateCcw className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
        badge: 'INSPECT',
        action: () => {
          onNavigate('return');
          onClose();
        },
      },
      {
        id: 'nav-maintenance',
        type: 'navigation',
        title: 'Repairs & Servicing (मरम्मत व सर्विस)',
        subtitle: 'Maintenance queue, oil changes, technical repairs, and service logs',
        icon: <Wrench className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        badge: 'SERVICE',
        action: () => {
          onNavigate('maintenance');
          onClose();
        },
      },
      {
        id: 'nav-payments',
        type: 'navigation',
        title: 'Payment History & UPI (भुगतान रिकॉर्ड)',
        subtitle: 'Instant Dynamic UPI QR code, cash receipts, and customer ledger',
        icon: <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        badge: 'FINANCE',
        action: () => {
          onNavigate('payments');
          onClose();
        },
      },
      {
        id: 'nav-cash',
        type: 'navigation',
        title: 'Daily Cash Register (आज का नकद हिसाब)',
        subtitle: 'Count cash in hand, shift handover, and safe reconciliation',
        icon: <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        badge: 'CASH',
        action: () => {
          onNavigate('cash');
          onClose();
        },
      },
      {
        id: 'nav-dealers',
        type: 'navigation',
        title: 'Partner Dealers (डीलर साथी)',
        subtitle: 'Partner dealer enrolled equipment and commission statements',
        icon: <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
        badge: 'PARTNERS',
        action: () => {
          onNavigate('dealers');
          onClose();
        },
      },
      {
        id: 'nav-support',
        type: 'navigation',
        title: 'Customer Inquiries & Waitlist (पूछताछ व सहायता)',
        subtitle: 'Website contact inquiries and machinery availability waitlist tickets',
        icon: <Headphones className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        badge: 'SUPPORT',
        action: () => {
          onNavigate('support');
          onClose();
        },
      },
      {
        id: 'nav-locations',
        type: 'navigation',
        title: 'Hub Locations (स्टेशन व केंद्र)',
        subtitle: 'Operating hub yards, delivery zones, and farmer village clusters',
        icon: <MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        badge: 'HUBS',
        action: () => {
          onNavigate('locations');
          onClose();
        },
      },
      {
        id: 'nav-rental-configs',
        type: 'navigation',
        title: 'Rental Rates Master (किराया दरें)',
        subtitle: 'Daily prices, security deposit requirements, and seasonal surge rules',
        icon: <SlidersHorizontal className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        badge: 'PRICING',
        action: () => {
          onNavigate('rental-configs');
          onClose();
        },
      },
      {
        id: 'nav-leads',
        type: 'navigation',
        title: 'Machinery Host Leads (मशीन मालिक व पार्टनर लीड्स)',
        subtitle: 'Website partner onboarding registrations and fleet monetization leads',
        icon: <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        badge: 'LEADS',
        action: () => {
          onNavigate('leads');
          onClose();
        },
      },
      {
        id: 'nav-reporting',
        type: 'navigation',
        title: 'Reports & Analytics (रिपोर्ट्स व विश्लेषण)',
        subtitle: 'Fleet utilization, category turnover, station efficiency, and operational metrics',
        icon: <BarChart3 className="h-4 w-4 text-[#0D5C46]" />,
        badge: 'REPORTS',
        action: () => {
          onNavigate('reporting');
          onClose();
        },
      },
    ];

    if (currentUser?.role === 'root' || currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      items.push({
        id: 'nav-users',
        type: 'navigation',
        title: 'Staff Users (स्टाफ सदस्य)',
        subtitle: 'Manage station team logins, security roles, and permissions',
        icon: <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
        badge: 'ACCESS',
        action: () => {
          onNavigate('users');
          onClose();
        },
      });
    }

    return items;
  }, [currentUser, isGuest, onNavigate, onClose]);

  // Filtered Assets from live registry
  const assetItems: PaletteItem[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const assets = api.assets || [];

    return assets
      .filter((a) => {
        const nameMatch = a.name?.toLowerCase().includes(q);
        const tagMatch = a.assetTag?.toLowerCase().includes(q);
        const snMatch = a.serialNumber?.toLowerCase().includes(q);
        const catMatch = a.category?.toLowerCase().includes(q);
        const modelMatch = a.modelName?.toLowerCase().includes(q);
        return nameMatch || tagMatch || snMatch || catMatch || modelMatch;
      })
      .slice(0, 6)
      .map((asset) => {
        let badgeColor = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
        if (asset.status === 'AVAILABLE') {
          badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
        } else if (asset.status === 'ON_RENT' || asset.status === 'DISPATCHED') {
          badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
        } else if (asset.status === 'MAINTENANCE' || asset.status === 'INSPECTION') {
          badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
        }

        const rc = api.getRentalConfigForAsset(asset);
        const rateText = rc?.baseDailyRate ? `${formatINR(rc.baseDailyRate)}/${rc.unitLabel || 'day'}` : (asset.dailyRate ? `${formatINR(asset.dailyRate)}/day` : 'Rate Unconfigured');
        const shiftText = rc?.shiftTerms || asset.shiftTerms || 'Standard Terms';
        return {
          id: `asset-${asset.id}`,
          type: 'asset' as const,
          title: asset.name,
          subtitle: `${asset.assetTag} • ${rateText} • Shift: ${shiftText}`,
          badge: asset.status === 'AVAILABLE' ? (rc ? 'READY' : 'UNCONFIGURED') : asset.status,
          badgeColor,
          imageUrl: asset.imageUrl,
          icon: <Truck className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
          action: () => {
            if (onSelectAsset && !isGuest) {
              onSelectAsset(asset);
            } else {
              onNavigate('catalog');
            }
            onClose();
          },
        };
      });
  }, [query, onSelectAsset, isGuest, onNavigate, onClose]);

  // Filtered Bookings from live registry
  const bookingItems: PaletteItem[] = useMemo(() => {
    if (!query.trim() || isGuest) return [];
    const q = query.toLowerCase().trim();
    const bookings = api.bookings || [];

    return bookings
      .filter((b) => {
        const numMatch = b.bookingNumber?.toLowerCase().includes(q);
        const nameMatch = b.customer?.fullName?.toLowerCase().includes(q);
        const phoneMatch = b.customer?.phone?.includes(q);
        const assetMatch = b.asset?.name?.toLowerCase().includes(q);
        const tagMatch = b.asset?.assetTag?.toLowerCase().includes(q);
        return numMatch || nameMatch || phoneMatch || assetMatch || tagMatch;
      })
      .slice(0, 5)
      .map((b) => {
        let badgeColor = 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
        if (b.status === 'CONFIRMED' || b.status === 'RETURNED') {
          badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
        } else if (b.status === 'DISPATCHED') {
          badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
        }

        return {
          id: `booking-${b.id}`,
          type: 'booking' as const,
          title: `${b.bookingNumber} • ${b.customer?.fullName || 'Customer'}`,
          subtitle: `${b.asset?.name || 'Machine'} • Phone: ${b.customer?.phone || '-'} • Total: ${formatINR(b.totalAmount)}`,
          badge: b.status,
          badgeColor,
          icon: <CalendarCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
          action: () => {
            onNavigate('booking');
            onClose();
          },
        };
      });
  }, [query, isGuest, onNavigate, onClose]);

  // Grouped items
  const { matchedActions, matchedNav, matchedAssets, matchedBookings } = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return {
        matchedActions: actionItems,
        matchedNav: navItems,
        matchedAssets: [],
        matchedBookings: [],
      };
    }

    const filteredAct = actionItems.filter(
      (item) => item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q)),
    );
    const filteredNavigation = navItems.filter(
      (item) => item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q)),
    );

    return {
      matchedActions: filteredAct,
      matchedNav: filteredNavigation,
      matchedAssets: assetItems,
      matchedBookings: bookingItems,
    };
  }, [query, actionItems, navItems, assetItems, bookingItems]);

  // Active items based on category pill
  const filteredItems = useMemo(() => {
    if (activeCategory === 'action') return matchedActions;
    if (activeCategory === 'asset') return matchedAssets;
    if (activeCategory === 'booking') return matchedBookings;
    if (activeCategory === 'navigation') return matchedNav;

    // 'all' category: actions first, then assets, bookings, and navigation
    return [...matchedActions, ...matchedAssets, ...matchedBookings, ...matchedNav];
  }, [activeCategory, matchedActions, matchedAssets, matchedBookings, matchedNav]);

  // Section grouping for 'all' mode
  const sectionedGroups = useMemo(() => {
    if (activeCategory !== 'all') {
      const titles: Record<PaletteCategory, string> = {
        all: 'All Results',
        action: 'Quick Actions (त्वरित कार्य)',
        asset: 'Machinery Fleet (उपकरण व मशीनें)',
        booking: 'Customer Bookings (बुकिंग व ग्राहक)',
        navigation: 'Station Navigation (स्टेशन संचालन)',
      };
      return [
        {
          key: activeCategory,
          title: titles[activeCategory],
          items: filteredItems.map((item, idx) => ({ item, index: idx })),
        },
      ];
    }

    const groups: {
      key: string;
      title: string;
      items: { item: PaletteItem; index: number }[];
    }[] = [];

    let runningIndex = 0;

    if (matchedActions.length > 0) {
      groups.push({
        key: 'actions',
        title: 'Quick Actions (त्वरित कार्य)',
        items: matchedActions.map((item) => ({ item, index: runningIndex++ })),
      });
    }

    if (matchedAssets.length > 0) {
      groups.push({
        key: 'assets',
        title: 'Machinery Fleet (उपकरण व मशीनें)',
        items: matchedAssets.map((item) => ({ item, index: runningIndex++ })),
      });
    }

    if (matchedBookings.length > 0) {
      groups.push({
        key: 'bookings',
        title: 'Active Bookings & Orders (बुकिंग)',
        items: matchedBookings.map((item) => ({ item, index: runningIndex++ })),
      });
    }

    if (matchedNav.length > 0) {
      groups.push({
        key: 'navigation',
        title: 'Station Navigation (स्टेशन संचालन)',
        items: matchedNav.map((item) => ({ item, index: runningIndex++ })),
      });
    }

    return groups;
  }, [activeCategory, filteredItems, matchedActions, matchedAssets, matchedBookings, matchedNav]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-item-index="${selectedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-20 px-3 sm:px-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-2xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200 transform scale-100',
          isDaylight
            ? 'bg-white/95 backdrop-blur-xl border-slate-200/90 shadow-[0_24px_70px_rgba(15,23,42,0.22),0_4px_20px_rgba(15,23,42,0.06)] text-slate-900'
            : 'bg-slate-900/95 backdrop-blur-xl border-slate-800/90 shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.08)] text-slate-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Redesigned Search Box Header ── */}
        <div
          className={cn(
            'relative flex items-center px-4 sm:px-5 py-3.5 sm:py-4 border-b transition-colors',
            isDaylight ? 'border-slate-100 bg-white/70' : 'border-slate-800/80 bg-slate-900/60',
          )}
        >
          {/* Spotlight Icon Badge */}
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 shadow-xs',
              isDaylight
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                : 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60',
            )}
          >
            <Search className="h-5 w-5" />
          </div>

          {/* Fully Borderless Clean Input */}
          <input
            ref={inputRef}
            type="text"
            data-palette-search="true"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type machine name, customer, phone, or page..."
            style={{
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              background: 'transparent',
            }}
            className={cn(
              'palette-search-input flex-1 min-w-0 mx-3 text-sm sm:text-base font-semibold tracking-tight transition-all placeholder:font-normal focus:outline-none',
              isDaylight
                ? 'text-slate-900 placeholder:text-slate-400'
                : 'text-white placeholder:text-slate-500',
            )}
          />

          {/* Trailing Controls: Clear query & ESC badge */}
          <div className="flex items-center gap-2 shrink-0">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className={cn(
                  'p-1.5 rounded-full transition-colors cursor-pointer',
                  isDaylight
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800',
                )}
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {query && (
              <span
                className={cn(
                  'hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border select-none',
                  isDaylight
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700',
                )}
              >
                {filteredItems.length} found
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'text-[10px] font-mono font-bold px-2 py-1 rounded-lg border select-none shadow-xs transition-colors cursor-pointer',
                isDaylight
                  ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700',
              )}
              title="Close palette"
            >
              ESC
            </button>
          </div>
        </div>

        {/* ── Category Quick Filter Chips ── */}
        <div
          className={cn(
            'px-4 sm:px-5 py-2 border-b flex items-center gap-1.5 overflow-x-auto text-xs select-none no-scrollbar',
            isDaylight ? 'border-slate-100 bg-slate-50/60' : 'border-slate-800/60 bg-slate-950/40',
          )}
        >
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSelectedIndex(0);
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0',
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900/20'
                : isDaylight
                  ? 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
            <Sparkles className="h-3 w-3" />
            <span>All</span>
            <span className="opacity-70 font-mono text-[10px]">
              ({matchedActions.length + matchedAssets.length + matchedBookings.length + matchedNav.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('action');
              setSelectedIndex(0);
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0',
              activeCategory === 'action'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900/20'
                : isDaylight
                  ? 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
            <Zap className="h-3 w-3 text-amber-500" />
            <span>Actions</span>
            <span className="opacity-70 font-mono text-[10px]">({matchedActions.length})</span>
          </button>

          {(matchedAssets.length > 0 || query.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory('asset');
                setSelectedIndex(0);
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0',
                activeCategory === 'asset'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900/20'
                  : isDaylight
                    ? 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
              )}
            >
              <Truck className="h-3 w-3 text-blue-500" />
              <span>Machines</span>
              <span className="opacity-70 font-mono text-[10px]">({matchedAssets.length})</span>
            </button>
          )}

          {(matchedBookings.length > 0 || query.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory('booking');
                setSelectedIndex(0);
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0',
                activeCategory === 'booking'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900/20'
                  : isDaylight
                    ? 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
              )}
            >
              <CalendarCheck className="h-3 w-3 text-purple-500" />
              <span>Bookings</span>
              <span className="opacity-70 font-mono text-[10px]">({matchedBookings.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveCategory('navigation');
              setSelectedIndex(0);
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0',
              activeCategory === 'navigation'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900/20'
                : isDaylight
                  ? 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
            <Compass className="h-3 w-3 text-teal-500" />
            <span>Navigation</span>
            <span className="opacity-70 font-mono text-[10px]">({matchedNav.length})</span>
          </button>
        </div>

        {/* ── Categorized Results List ── */}
        <div ref={listRef} className="max-h-[380px] sm:max-h-[440px] overflow-y-auto p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div
                className={cn(
                  'h-12 w-12 rounded-2xl mx-auto mb-3 flex items-center justify-center border',
                  isDaylight
                    ? 'bg-slate-50 border-slate-200 text-slate-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-500',
                )}
              >
                <Search className="h-6 w-6 opacity-60" />
              </div>
              <p
                className={cn(
                  'font-bold text-sm tracking-tight',
                  isDaylight ? 'text-slate-800' : 'text-slate-200',
                )}
              >
                No results found for "{query}"
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Check for typos or try searching with simple keywords like tractor, harvester, or customer name.
              </p>

              {/* Quick suggestions */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Suggestions:</span>
                {['Tractor', 'New Booking', 'Dispatch', 'Mixer', 'Payments'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer',
                      isDaylight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700',
                    )}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            sectionedGroups.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <div key={group.key} className="space-y-1">
                  {/* Subtle Section Label */}
                  <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>{group.title}</span>
                    <span className="font-mono text-[9px] opacity-70">{group.items.length}</span>
                  </div>

                  {/* Items in section */}
                  {group.items.map(({ item, index }) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        data-item-index={index}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-all duration-150 select-none border',
                          isSelected
                            ? isDaylight
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-950 shadow-xs'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-white shadow-xs'
                            : isDaylight
                              ? 'border-transparent hover:bg-slate-100/80 text-slate-700'
                              : 'border-transparent hover:bg-slate-800/60 text-slate-300',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Item Icon or Asset Thumbnail */}
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-9 w-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div
                              className={cn(
                                'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border transition-transform duration-150 group-hover:scale-105',
                                isSelected
                                  ? isDaylight
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                    : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                                  : isDaylight
                                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                                    : 'bg-slate-800 border-slate-700 text-slate-400',
                              )}
                            >
                              {item.icon}
                            </div>
                          )}

                          {/* Item Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'font-bold truncate text-xs sm:text-sm',
                                  isSelected
                                    ? isDaylight
                                      ? 'text-slate-950 font-black'
                                      : 'text-white font-black'
                                    : isDaylight
                                      ? 'text-slate-800'
                                      : 'text-slate-200',
                                )}
                              >
                                {item.title}
                              </span>

                              {item.badge && (
                                <span
                                  className={cn(
                                    'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0',
                                    item.badgeColor ||
                                      (isDaylight
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'),
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>

                            {item.subtitle && (
                              <p
                                className={cn(
                                  'text-[11px] truncate mt-0.5 font-normal',
                                  isDaylight ? 'text-slate-500' : 'text-slate-400',
                                )}
                              >
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Selected Indicator / Action Hint */}
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {isSelected ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs',
                                  isDaylight
                                    ? 'bg-white text-emerald-800 border-emerald-300'
                                    : 'bg-slate-800 text-emerald-300 border-emerald-700',
                                )}
                              >
                                <span>Open</span>
                                <CornerDownLeft className="h-3 w-3" />
                              </span>
                              <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 transition-transform translate-x-0.5" />
                            </div>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ── Polished Footer Status Bar ── */}
        <div
          className={cn(
            'px-4 sm:px-5 py-2.5 border-t flex items-center justify-between text-[11px] select-none',
            isDaylight
              ? 'border-slate-100 bg-slate-50/80 text-slate-500'
              : 'border-slate-800/80 bg-slate-950/70 text-slate-400',
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd
                className={cn(
                  'px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shadow-xs',
                  isDaylight ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700',
                )}
              >
                ↑
              </kbd>
              <kbd
                className={cn(
                  'px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shadow-xs',
                  isDaylight ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700',
                )}
              >
                ↓
              </kbd>
              <span className="ml-0.5">navigate</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd
                className={cn(
                  'px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shadow-xs',
                  isDaylight ? 'bg-white text-emerald-800 border-slate-200' : 'bg-slate-800 text-emerald-300 border-slate-700',
                )}
              >
                ↵
              </kbd>
              <span className="ml-0.5">select</span>
            </span>

            <span className="hidden sm:flex items-center gap-1">
              <kbd
                className={cn(
                  'px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shadow-xs',
                  isDaylight ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700',
                )}
              >
                ESC
              </kbd>
              <span className="ml-0.5">close</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className={isDaylight ? 'text-slate-600 font-bold' : 'text-slate-400'}>EquipGrid Command</span>
          </div>
        </div>
      </div>
    </div>
  );
};
