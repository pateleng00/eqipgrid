import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Sun,
  Moon,
  LogOut,
  Zap,
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { useAuth, UserRole } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import logoRectangle from '../assets/logo-rectangle.png';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewDeployment?: () => void;
}

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: 'Admin',
    className:
      'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  },
  manager: {
    label: 'Manager',
    className:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  },
  user: {
    label: 'Staff',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  guest: {
    label: 'Guest',
    className:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
  },
};

const ROLE_AVATAR: Record<UserRole, string> = {
  admin: 'bg-purple-600 text-white',
  manager: 'bg-blue-600 text-white',
  user: 'bg-emerald-600 text-white',
  guest: 'bg-slate-500 text-white',
};

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onNewDeployment }) => {
  const { isDaylight, toggleTheme } = useTheme();
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
        'sticky top-0 z-40 w-full border-b backdrop-blur-md px-4 sm:px-6 py-2 transition-colors duration-200',
        isDaylight
          ? 'border-slate-300 bg-white/80 text-slate-950'
          : 'border-slate-800/80 bg-slate-950/90 text-white'
      )}
    >
      <div className="flex items-center justify-between gap-4">

        {/*  ── Left: Logo + Location ── */}
        <div className="flex items-center gap-3">

          {/* Horizontal EquipGrid Logo */}
          <div
            className={cn(
              'flex h-11 w-[90px] shrink-0 items-center'
            )}
          >
            <img
              src={logoRectangle}
              alt="EquipGrid - Powering Work. Growing Progress."
              className="h-full w-full object-contain object-left"
            />
          </div>

          {/* Location / Guest information */}
          <div>
            <div
              className={cn(
                'mt-0.5 text-[11px]',
                isDaylight
                  ? 'text-slate-500 font-semibold'
                  : 'text-slate-400'
              )}
            >
              {isGuest ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide border',
                    isDaylight
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-amber-900/25 text-amber-400 border-amber-700/40'
                  )}
                >
                  Machinery Catalog
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <MapPin
                    className={cn(
                      'h-3 w-3',
                      isDaylight ? 'text-amber-700' : 'text-slate-500'
                    )}
                  />
                  {currentUser?.hubLocation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: New Booking + Profile Dropdown ── */}
        <div className="flex items-center gap-2">

          {/* New Deployment — only for permissioned staff, not guests */}
          {currentUser?.permissions.canBook && !isGuest && (
            <button
              onClick={onNewDeployment}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                isDaylight
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
              )}
            >
              <Zap
                className={cn(
                  'h-3.5 w-3.5',
                  isDaylight ? 'text-slate-950' : 'text-slate-400'
                )}
              />
              <span className="hidden sm:inline">New Deployment</span>
            </button>
          )}

          {/* ── Profile Avatar + Dropdown ── */}
          {currentUser && (
            <div className="relative" ref={dropdownRef}>

              {/* Avatar trigger — initials only */}
              <button
                onClick={() => setShowProfile((p) => !p)}
                aria-label="Open profile menu"
                title={currentUser.name}
                className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-black tracking-tight transition-all cursor-pointer border-2 select-none',
                  avatarBg,
                  showProfile
                    ? isDaylight
                      ? 'border-slate-950 ring-2 ring-slate-950/20'
                      : 'border-slate-300 ring-2 ring-white/10'
                    : isDaylight
                    ? 'border-transparent hover:border-slate-400'
                    : 'border-transparent hover:border-slate-600'
                )}
              >
                {currentUser.avatarInitials}
              </button>

              {/* ── Dropdown Panel ── */}
              {showProfile && (
                <div
                  className={cn(
                    'absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden',
                    isDaylight
                      ? 'bg-white border-slate-200 text-slate-950'
                      : 'bg-[#2c2c2c] border-slate-800 text-slate-100'
                  )}
                >

                  {/* User identity block */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 border-b',
                      isDaylight ? 'border-slate-100' : 'border-slate-800'
                    )}
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                        avatarBg
                      )}
                    >
                      {currentUser.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="font-black text-sm truncate">
                        {currentUser.name}
                      </div>

                      <div
                        className={cn(
                          'text-[11px] font-mono truncate',
                          isDaylight ? 'text-slate-500' : 'text-slate-400'
                        )}
                      >
                        {currentUser.email}
                      </div>

                      <span
                        className={cn(
                          'inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                          roleBadge.className
                        )}
                      >
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions list */}
                  <div className="p-2 space-y-0.5">

                    {/* Daylight Mode Toggle */}
                    <button
                      onClick={toggleTheme}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer',
                        isDaylight
                          ? 'hover:bg-slate-100 text-slate-700'
                          : 'hover:bg-slate-800 text-slate-300'
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        {isDaylight ? (
                          <Sun className="h-3.5 w-3.5 text-amber-600 animate-[spin_12s_linear_infinite]" />
                        ) : (
                          <Moon className="h-3.5 w-3.5 text-slate-400" />
                        )}

                        <span className="font-semibold">
                          {isDaylight ? 'Daylight Mode' : 'Night Mode'}
                        </span>
                      </span>

                      {/* Toggle pill */}
                      <span
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors border',
                          isDaylight
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-slate-700 border-slate-600'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                            isDaylight ? 'translate-x-4' : 'translate-x-0.5'
                          )}
                        />
                      </span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div
                    className={cn(
                      'p-2 border-t',
                      isDaylight ? 'border-slate-100' : 'border-slate-800'
                    )}
                  >
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        logout();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer",
                        isDaylight
                          ? "text-rose-700 bg-rose-50/60 hover:bg-rose-100 border border-rose-200/80"
                          : "text-rose-400 hover:bg-rose-500/10"
                      )}
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span className="font-bold text-rose-700 dark:text-rose-400">{isGuest ? 'Back to Sign In' : 'Sign Out'}</span>
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
