import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'manager' | 'user' | 'guest';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  hubLocation: string;
  avatarInitials: string;
  permissions: {
    canManageFleet: boolean;
    canDispatch: boolean;
    canManagePricing: boolean;
    canManageLocations: boolean;
    canBook: boolean;
    isReadOnly: boolean;
  };
}

export const PRESET_USERS: Record<UserRole, AuthUser> = {
  admin: {
    id: 'usr-admin-01',
    name: 'Vikramaditya Rao',
    email: 'admin@equipgrid.in',
    role: 'admin',
    roleTitle: 'Super Administrator',
    hubLocation: 'Central Headquarter (UP)',
    avatarInitials: 'VR',
    permissions: {
      canManageFleet: true,
      canDispatch: true,
      canManagePricing: true,
      canManageLocations: true,
      canBook: true,
      isReadOnly: false,
    },
  },
  manager: {
    id: 'usr-mgr-02',
    name: 'Rajesh Sharma',
    email: 'manager.hardoi@equipgrid.in',
    role: 'manager',
    roleTitle: 'Yard & Fleet Manager',
    hubLocation: 'Hardoi Central Hub Yard',
    avatarInitials: 'RS',
    permissions: {
      canManageFleet: true,
      canDispatch: true,
      canManagePricing: false,
      canManageLocations: false,
      canBook: true,
      isReadOnly: false,
    },
  },
  user: {
    id: 'usr-desk-03',
    name: 'Amit Verma',
    email: 'booking.desk@equipgrid.in',
    role: 'user',
    roleTitle: 'Station Booking Desk Operator',
    hubLocation: 'Hardoi Central Hub Yard',
    avatarInitials: 'AV',
    permissions: {
      canManageFleet: false,
      canDispatch: false,
      canManagePricing: false,
      canManageLocations: false,
      canBook: true,
      isReadOnly: false,
    },
  },
  guest: {
    id: 'usr-gst-04',
    name: 'Field Auditor / Viewer',
    email: 'guest.auditor@equipgrid.in',
    role: 'guest',
    roleTitle: 'Guest (Read-Only Access)',
    hubLocation: 'All UP Hubs (Viewer)',
    avatarInitials: 'GA',
    permissions: {
      canManageFleet: false,
      canDispatch: false,
      canManagePricing: false,
      canManageLocations: false,
      canBook: false,
      isReadOnly: true,
    },
  },
};

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loginAsRole: (role: UserRole) => void;
  loginWithCredentials: (email: string, role?: UserRole) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'equipgrid_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    // Default to admin for seamless first load or null if login is required
    return PRESET_USERS.admin;
  });

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const loginAsRole = (role: UserRole) => {
    const user = PRESET_USERS[role];
    setCurrentUser(user);
  };

  const loginWithCredentials = (email: string): boolean => {
    const lower = email.toLowerCase().trim();
    // Match against known preset users
    const foundUser = Object.values(PRESET_USERS).find(
      (u) => u.email.toLowerCase() === lower
    );

    if (foundUser) {
      setCurrentUser(foundUser);
      return true;
    }

    // Determine role based on credentials / email prefix
    let role: UserRole = 'user';
    if (lower.includes('admin') || lower.includes('super') || lower.includes('hq')) {
      role = 'admin';
    } else if (lower.includes('manager') || lower.includes('yard') || lower.includes('lead')) {
      role = 'manager';
    }

    const fallback: AuthUser = {
      ...PRESET_USERS[role],
      id: `usr-${Date.now()}`,
      email,
      name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Station Operator',
    };
    setCurrentUser(fallback);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole) => {
    loginAsRole(role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loginAsRole,
        loginWithCredentials,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
