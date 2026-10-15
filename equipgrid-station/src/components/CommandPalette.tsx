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
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../lib/ThemeContext';
import { useAuth } from '../lib/AuthContext';
import { formatINR, cn } from '../lib/utils';
import { Asset, Booking } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onNewDeployment?: () => void;
  onSelectAsset?: (asset: Asset) => void;
}

interface PaletteItem {
  id: string;
  type: 'navigation' | 'asset' | 'booking' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isGuest = currentUser?.role === 'guest';

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Base navigation pages with plain, simple names
  const navItems: PaletteItem[] = useMemo(() => {
    if (isGuest) {
      return [
        {
          id: 'nav-catalog',
          type: 'navigation',
          title: 'All Machines (सभी मशीनें)',
          subtitle: 'Browse all agricultural & construction equipment',
          icon: <Truck className="h-4 w-4" />,
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
        title: "Today's Work (आज का काम - Dashboard)",
        subtitle: 'View today’s bookings, machines on rent, and collections',
        icon: <LayoutDashboard className="h-4 w-4 text-amber-500" />,
        action: () => {
          onNavigate('dashboard');
          onClose();
        },
      },
      {
        id: 'nav-catalog',
        type: 'navigation',
        title: 'All Machines (सभी मशीनें)',
        subtitle: 'Catalog of all equipment, rental rates, and ID numbers',
        icon: <Truck className="h-4 w-4 text-blue-500" />,
        action: () => {
          onNavigate('catalog');
          onClose();
        },
      },
      {
        id: 'nav-maintenance',
        type: 'navigation',
        title: 'Repairs & Servicing (मरम्मत व सर्विस)',
        subtitle: 'Check damaged machines, oil changes, and technical inspection',
        icon: <Wrench className="h-4 w-4 text-rose-500" />,
        action: () => {
          onNavigate('maintenance');
          onClose();
        },
      },
      {
        id: 'nav-booking',
        type: 'navigation',
        title: 'Bookings & Orders (बुकिंग व ग्राहक)',
        subtitle: 'Take customer bookings, add Aadhaar, and calculate rent',
        icon: <CalendarCheck className="h-4 w-4 text-purple-500" />,
        action: () => {
          onNavigate('booking');
          onClose();
        },
      },
      {
        id: 'nav-dispatch',
        type: 'navigation',
        title: 'Send Machine Out (मशीन भेजना - Dispatch)',
        subtitle: 'Handover checklist and delivery receipt before sending machine',
        icon: <Send className="h-4 w-4 text-amber-500" />,
        action: () => {
          onNavigate('dispatch');
          onClose();
        },
      },
      {
        id: 'nav-return',
        type: 'navigation',
        title: 'Receive Machine Return (वापसी व रिफंड)',
        subtitle: 'Check machine condition upon return and refund deposit',
        icon: <RotateCcw className="h-4 w-4 text-indigo-500" />,
        action: () => {
          onNavigate('return');
          onClose();
        },
      },
      {
        id: 'nav-payments',
        type: 'navigation',
        title: 'Payment History & UPI (भुगतान रिकॉर्ड)',
        subtitle: 'Show UPI QR code, record cash received, and print receipts',
        icon: <BookOpen className="h-4 w-4 text-emerald-500" />,
        action: () => {
          onNavigate('payments');
          onClose();
        },
      },
      {
        id: 'nav-cash',
        type: 'navigation',
        title: 'Daily Cash Register (आज का नकद हिसाब)',
        subtitle: 'Count cash in hand at end of shift',
        icon: <BarChart3 className="h-4 w-4 text-sky-500" />,
        action: () => {
          onNavigate('cash');
          onClose();
        },
      },
      {
        id: 'nav-dealers',
        type: 'navigation',
        title: 'Partner Dealers (डीलर साथी)',
        subtitle: 'Partner equipment enrolled in the station',
        icon: <Users className="h-4 w-4 text-teal-500" />,
        action: () => {
          onNavigate('dealers');
          onClose();
        },
      },
      {
        id: 'nav-locations',
        type: 'navigation',
        title: 'Hub Locations (स्टेशन व केंद्र)',
        subtitle: 'List of all stations and operating areas',
        icon: <MapPin className="h-4 w-4 text-rose-500" />,
        action: () => {
          onNavigate('locations');
          onClose();
        },
      },
      {
        id: 'nav-rental-configs',
        type: 'navigation',
        title: 'Rental Rates Master (किराया दरें)',
        subtitle: 'Daily prices and deposit rules',
        icon: <SlidersHorizontal className="h-4 w-4 text-amber-500" />,
        action: () => {
          onNavigate('rental-configs');
          onClose();
        },
      },
    ];

    if (currentUser?.role === 'root' || currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      items.push({
        id: 'nav-users',
        type: 'navigation',
        title: 'Staff Users (स्टाफ सदस्य)',
        subtitle: 'Manage station team logins and permissions',
        icon: <UserCheck className="h-4 w-4 text-emerald-500" />,
        action: () => {
          onNavigate('users');
          onClose();
        },
      });
    }

    return items;
  }, [currentUser, isGuest, onNavigate, onClose]);

  // Quick Action items
  const actionItems: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [
      {
        id: 'act-theme',
        type: 'action',
        title: isDaylight ? 'Switch to Night Mode (रात का मोड)' : 'Switch to Daylight Mode (दिन का मोड)',
        subtitle: isDaylight ? 'Dark screen theme' : 'Bright daylight theme',
        icon: isDaylight ? <Moon className="h-4 w-4 text-indigo-400" /> : <Sun className="h-4 w-4 text-amber-500" />,
        action: () => {
          toggleTheme();
          onClose();
        },
      },
    ];

    if (!isGuest && onNewDeployment) {
      list.unshift({
        id: 'act-new-deploy',
        type: 'action',
        title: '+ New Booking (नई बुकिंग)',
        subtitle: 'Book a machine for a walk-in or calling farmer',
        icon: <Zap className="h-4 w-4 text-amber-500" />,
        badge: 'ACTION',
        action: () => {
          onNewDeployment();
          onClose();
        },
      });
    }

    return list;
  }, [isDaylight, toggleTheme, isGuest, onNewDeployment, onClose]);

  // Filtered Assets from registry
  const assetItems: PaletteItem[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const assets = api.assets || [];

    return assets
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((asset) => ({
        id: `asset-${asset.id}`,
        type: 'asset' as const,
        title: asset.name,
        subtitle: `${asset.assetTag} • Rent: ${formatINR(asset.dailyRate)}/day • Status: ${asset.status}`,
        badge: asset.status === 'AVAILABLE' ? 'READY' : asset.status,
        icon: <Truck className="h-4 w-4 text-amber-500" />,
        action: () => {
          if (onSelectAsset && !isGuest) {
            onSelectAsset(asset);
          } else {
            onNavigate('catalog');
          }
          onClose();
        },
      }));
  }, [query, onSelectAsset, isGuest, onNavigate, onClose]);

  // Filtered Bookings
  const bookingItems: PaletteItem[] = useMemo(() => {
    if (!query.trim() || isGuest) return [];
    const q = query.toLowerCase();
    const bookings = api.bookings || [];

    return bookings
      .filter(
        (b) =>
          b.bookingNumber.toLowerCase().includes(q) ||
          b.customer.fullName.toLowerCase().includes(q) ||
          b.customer.phone.includes(q) ||
          b.asset.name.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((b) => ({
        id: `booking-${b.id}`,
        type: 'booking' as const,
        title: `${b.bookingNumber} - ${b.customer.fullName} (${b.customer.phone})`,
        subtitle: `${b.asset.name} (${b.asset.assetTag}) • Total: ${formatINR(b.totalAmount)}`,
        badge: b.status,
        icon: <CalendarCheck className="h-4 w-4 text-blue-500" />,
        action: () => {
          onNavigate('dashboard');
          onClose();
        },
      }));
  }, [query, isGuest, onNavigate, onClose]);

  // Filtered items combined
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return [...actionItems, ...navItems];
    }

    const matchedNav = navItems.filter(
      (item) => item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q)),
    );
    const matchedActions = actionItems.filter(
      (item) => item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q)),
    );

    return [...matchedActions, ...matchedNav, ...assetItems, ...bookingItems];
  }, [query, navItems, actionItems, assetItems, bookingItems]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
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
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={cn(
          'w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all',
          isDaylight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
            : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/50',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 border-b',
            isDaylight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40',
          )}
        >
          <Search className={cn('h-5 w-5 shrink-0', isDaylight ? 'text-slate-400' : 'text-slate-500')} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type machine name, customer name, or page to open..."
            className={cn(
              'flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder-slate-400',
              isDaylight ? 'text-slate-950' : 'text-white',
            )}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd
            className={cn(
              'text-[10px] font-mono font-bold px-2 py-0.5 rounded border select-none',
              isDaylight ? 'bg-white text-slate-500 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700',
            )}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No results found for "{query}"</p>
              <p className="text-[11px] mt-1 text-slate-500">
                Try searching for "Mixer", "Ramesh", "Booking", or "Payment"
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-colors select-none',
                    isSelected
                      ? isDaylight
                        ? 'bg-amber-500/10 text-slate-950 font-semibold'
                        : 'bg-amber-500/15 text-white font-semibold'
                      : isDaylight
                        ? 'hover:bg-slate-100 text-slate-700'
                        : 'hover:bg-slate-800/60 text-slate-300',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'p-2 rounded-lg border shrink-0',
                        isSelected
                          ? isDaylight
                            ? 'bg-amber-100 border-amber-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : isDaylight
                            ? 'bg-slate-100 border-slate-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400',
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider',
                              item.badge === 'NEW'
                                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                : item.badge === 'READY'
                                  ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p
                          className={cn(
                            'text-[11px] truncate mt-0.5',
                            isDaylight ? 'text-slate-500' : 'text-slate-400',
                          )}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform',
                      isSelected ? 'opacity-100 translate-x-0.5 text-amber-500' : 'opacity-0',
                    )}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          className={cn(
            'px-4 py-2 border-t flex items-center justify-between text-[11px]',
            isDaylight
              ? 'border-slate-200 bg-slate-50 text-slate-500'
              : 'border-slate-800 bg-slate-950/60 text-slate-500',
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">↓</kbd> to
              move
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">↵</kbd> to
              open
            </span>
          </div>
          <span className="font-mono text-[10px]">EquipGrid Station</span>
        </div>
      </div>
    </div>
  );
};
