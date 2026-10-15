/**
 * Navigation state persistence service for EquipGrid Station
 *
 * Rules:
 * 1. Fresh login lands directly on 'dashboard' and cleans up previous query states.
 * 2. If session is valid and browser refreshes, preserves the exact sidebar tab,
 *    subtab, and active modal using both localStorage and URL search parameters.
 * 3. Browser Back / Forward navigation updates the active tab seamlessly via popstate.
 */

export const VALID_TABS = [
  'dashboard',
  'catalog',
  'maintenance',
  'booking',
  'dispatch',
  'rental-configs',
  'locations',
  'return',
  'payments',
  'dealers',
  'cash',
  'users',
] as const;

export type StationTab = (typeof VALID_TABS)[number];

const ACTIVE_TAB_STORAGE_KEY = 'equipgrid_station_active_tab';
const FRESH_LOGIN_STORAGE_KEY = 'equipgrid_station_just_logged_in';

/**
 * Marks that an explicit user login occurred (so the app immediately routes to Dashboard).
 */
export function markFreshLogin(): void {
  try {
    sessionStorage.setItem(FRESH_LOGIN_STORAGE_KEY, 'true');
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, 'dashboard');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('modal');
      url.searchParams.delete('subtab');
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Clears station navigation state on user logout.
 */
export function clearStationState(): void {
  try {
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    sessionStorage.removeItem(FRESH_LOGIN_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('modal');
      url.searchParams.delete('subtab');
      window.history.replaceState({}, '', url.pathname);
    }
  } catch {
    // ignore
  }
}

/**
 * Computes initial active tab on page mount/refresh.
 */
export function getInitialActiveTab(isGuest: boolean): string {
  if (isGuest) return 'catalog';

  try {
    const isFreshLogin = sessionStorage.getItem(FRESH_LOGIN_STORAGE_KEY);
    if (isFreshLogin === 'true') {
      sessionStorage.removeItem(FRESH_LOGIN_STORAGE_KEY);
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, 'dashboard');
      return 'dashboard';
    }

    // 1. Check URL query param first (?tab=...)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      if (urlTab === 'yard-map') {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, 'catalog');
        return 'catalog';
      }
      if (urlTab && VALID_TABS.includes(urlTab as any)) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, urlTab);
        return urlTab;
      }

      // Check URL hash fallback (#payments)
      const hashTab = window.location.hash.replace(/^#/, '');
      if (hashTab === 'yard-map') {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, 'catalog');
        return 'catalog';
      }
      if (hashTab && VALID_TABS.includes(hashTab as any)) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, hashTab);
        return hashTab;
      }
    }

    // 2. Check localStorage saved tab
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (saved && VALID_TABS.includes(saved as any)) {
      return saved;
    }
  } catch {
    // ignore
  }

  return 'dashboard';
}

/**
 * Persists tab change to both localStorage and URL search parameters.
 */
export function persistActiveTab(tab: string): void {
  try {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'dashboard') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Reads a URL search parameter.
 */
export function getUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

/**
 * Updates or removes a URL search parameter without reloading the page.
 */
export function setUrlParam(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // ignore
  }
}
