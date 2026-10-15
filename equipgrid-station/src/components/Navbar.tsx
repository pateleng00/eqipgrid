import React, { useState, useRef, useEffect } from 'react';
import { MapPin, LogOut, Zap, Search } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useAuth, UserRole } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import logoRectangle from '../assets/logo-rectangle.png';
import { NotificationsPopover } from './NotificationsPopover';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewDeployment?: () => void;
  onOpenCommandPalette?: () => void;
}

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  root: {
    label: 'Root (Super Admin)',
    className: 'bg-teal-50 text-teal-900 border-teal-300 font-black',
  },
  admin: {
    label: 'Admin (एडमिन)',
    className: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
  },
  manager: {
    label: 'Yard Manager (यार्ड मैनेजर)',
    className: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
  },
  user: {
    label: 'Yard Staff (स्टाफ)',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  },
  guest: {
    label: 'Guest (अतिथि)',
    className: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
  },
};

const ROLE_AVATAR: Record<UserRole, string> = {
  root: 'bg-teal-700 text-white font-bold ring-2 ring-teal-500',
  admin: 'bg-purple-600 text-white',
  manager: 'bg-blue-600 text-white',
  user: 'bg-emerald-600 text-white',
  guest: 'bg-slate-500 text-white',
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onNewDeployment, onOpenCommandPalette }) => {
  const { isDaylight } = useTheme();
  const { currentUser, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isGuest = currentUser?.role === 'guest';
  const userRole: UserRole = currentUser?.role || 'user';
  const roleBadge = ROLE_BADGE[userRole];
  const avatarBg = ROLE_AVATAR[userRole];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b backdrop-blur-md px-3 sm:px-5 py-2 transition-colors duration-200',
        isDaylight ? 'border-slate-300 bg-white/90 text-slate-950' : 'border-slate-800/80 bg-slate-950/90 text-white',
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/*  ── Left: Logo + Station Hub Info ── */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Horizontal EquipGrid Logo */}
          <div
            onClick={() => onTabChange(isGuest ? 'catalog' : 'dashboard')}
            className={cn('flex h-10 w-[84px] sm:w-[92px] shrink-0 items-center cursor-pointer')}
          >
            <img
              src={logoRectangle}
              alt="EquipGrid - Powering Work. Growing Progress."
              className="h-full w-full object-contain object-left"
            />
          </div>

          {/* Location & Station Status Pulse */}
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
            </div>

            <div
              className={cn(
                'mt-0.5 text-[10px] font-mono flex items-center gap-1',
                isDaylight ? 'text-slate-500' : 'text-slate-400',
              )}
            >
              {isGuest ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold uppercase tracking-wide border bg-teal-50 text-teal-800 border-teal-200">
                  Machinery Catalog (कैटलॉग)
                </span>
              ) : (
              
                <>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Center: Search Input Pill (Plain English + Hindi hint) ── */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <button
            onClick={onOpenCommandPalette}
            type="button"
            className={cn(
              'w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-300/80 text-slate-500 hover:text-slate-900 shadow-xs'
                : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 shadow-inner',
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Search machine name, customer name, phone number...</span>
            </span>

            <kbd
              className={cn(
                'shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ml-2 select-none shadow-xs',
                isDaylight
                  ? 'bg-white text-slate-600 border-slate-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700',
              )}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ── Right: Speed Actions + Notifications + Theme + Profile ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile search trigger */}
          <button
            onClick={onOpenCommandPalette}
            className={cn(
              'md:hidden h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700',
            )}
            title="Search (खोजें)"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* New Booking Button */}
          {currentUser?.permissions.canBook && !isGuest && (
            <button
              onClick={onNewDeployment}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 bg-teal-700 hover:bg-teal-800 text-white border border-teal-800"
            >
              <Zap className="h-3.5 w-3.5 text-white" />
              <span className="hidden sm:inline">+ New Booking (नई बुकिंग)</span>
            </button>
          )}

          {/* Operational Alerts Popover */}
          {!isGuest && <NotificationsPopover onNavigate={onTabChange} />}

          {/* ── Profile Avatar + Dropdown ── */}
          {currentUser && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfile((p) => !p)}
                aria-label="Open profile menu"
                data-tooltip={currentUser.name}
                data-tooltip-pos="bottom"
                className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-black tracking-tight transition-all cursor-pointer border-2 select-none',
                  avatarBg,
                  showProfile
                    ? isDaylight
                      ? 'border-slate-950 ring-2 ring-slate-950/20'
                      : 'border-slate-300 ring-2 ring-white/10'
                    : isDaylight
                      ? 'border-transparent hover:border-slate-400'
                      : 'border-transparent hover:border-slate-600',
                )}
              >
                {currentUser.avatarInitials}
              </button>

              {/* ── Dropdown Panel ── */}
              {showProfile && (
                <div
                  className={cn(
                    'absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150',
                    isDaylight
                      ? 'bg-white border-slate-200 text-slate-950'
                      : 'bg-slate-900 border-slate-800 text-slate-100',
                  )}
                >
                  {/* User identity */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 border-b',
                      isDaylight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40',
                    )}
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                        avatarBg,
                      )}
                    >
                      {currentUser.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="font-black text-sm truncate">{currentUser.name}</div>

                      <div
                        className={cn(
                          'text-[11px] font-mono truncate',
                          isDaylight ? 'text-slate-500' : 'text-slate-400',
                        )}
                      >
                        {currentUser.email}
                      </div>

                      <span
                        className={cn(
                          'inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                          roleBadge.className,
                        )}
                      >
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2 space-y-0.5">

                    <button
                      onClick={() => {
                        setShowProfile(false);
                        onOpenCommandPalette?.();
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer',
                        isDaylight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300',
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold">Quick Search (खोजें)</span>
                      </span>
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                        ⌘K
                      </kbd>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className={cn('p-2 border-t', isDaylight ? 'border-slate-100' : 'border-slate-800')}>
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        logout();
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
                        isDaylight
                          ? 'text-rose-700 bg-rose-50/60 hover:bg-rose-100 border border-rose-200/80'
                          : 'text-rose-400 hover:bg-rose-500/10',
                      )}
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span className="font-bold text-rose-700 dark:text-rose-400">
                        {isGuest ? 'Back to Sign In' : 'Sign Out (लॉग आउट)'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
