import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'root' | 'admin' | 'manager' | 'user' | 'guest';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  roleTitle: string;
  hubId?: number | null;
  hubLocation: string;
  avatarInitials: string;
  token?: string;
  permissions: {
    canManageUsers: boolean;
    canDeleteUsers: boolean;
    canDeleteAdmins: boolean;
    canDeleteManagers: boolean;
    canManageAllHubs: boolean;
    canManageFleet: boolean;
    canDeleteMachines: boolean;
    canDispatch: boolean;
    canManagePricing: boolean;
    canManageLocations: boolean;
    canBook: boolean;
    canRefund: boolean;
    isReadOnly: boolean;
  };
}

export const PRESET_USERS: Record<UserRole, AuthUser> = {
  root: {
    id: 'usr-root-01',
    name: 'Vikramaditya Rao',
    email: 'admin@equipgrid.in',
    username: 'admin@equipgrid.in',
    role: 'root',
    roleTitle: 'Root (Super Administrator)',
    hubLocation: 'Central Headquarter (UP)',
    avatarInitials: 'VR',
    permissions: {
      canManageUsers: true,
      canDeleteUsers: true,
      canDeleteAdmins: true,
      canDeleteManagers: true,
      canManageAllHubs: true,
      canManageFleet: true,
      canDeleteMachines: true,
      canDispatch: true,
      canManagePricing: true,
      canManageLocations: true,
      canBook: true,
      canRefund: true,
      isReadOnly: false,
    },
  },
  admin: {
    id: 'usr-admin-02',
    name: 'Priya Singhania',
    email: 'admin.ops@equipgrid.in',
    username: 'admin.ops@equipgrid.in',
    role: 'admin',
    roleTitle: 'Operations Administrator',
    hubLocation: 'Central Headquarter (UP)',
    avatarInitials: 'PS',
    permissions: {
      canManageUsers: true,
      canDeleteUsers: true,
      canDeleteAdmins: false,
      canDeleteManagers: false,
      canManageAllHubs: true,
      canManageFleet: true,
      canDeleteMachines: false,
      canDispatch: true,
      canManagePricing: true,
      canManageLocations: true,
      canBook: true,
      canRefund: true,
      isReadOnly: false,
    },
  },
  manager: {
    id: 'usr-mgr-03',
    name: 'Rajesh Sharma',
    email: 'manager.hardoi@equipgrid.in',
    username: 'manager.hardoi@equipgrid.in',
    role: 'manager',
    roleTitle: 'Yard & Fleet Manager',
    hubId: 1,
    hubLocation: 'Hardoi Central Hub Yard',
    avatarInitials: 'RS',
    permissions: {
      canManageUsers: true,
      canDeleteUsers: true,
      canDeleteAdmins: false,
      canDeleteManagers: false,
      canManageAllHubs: false,
      canManageFleet: false,
      canDeleteMachines: false,
      canDispatch: true,
      canManagePricing: false,
      canManageLocations: false,
      canBook: true,
      canRefund: true,
      isReadOnly: false,
    },
  },
  user: {
    id: 'usr-desk-04',
    name: 'Amit Verma',
    email: 'booking.desk@equipgrid.in',
    username: 'booking.desk@equipgrid.in',
    role: 'user',
    roleTitle: 'Station Booking Desk Operator',
    hubId: 1,
    hubLocation: 'Hardoi Central Hub Yard',
    avatarInitials: 'AV',
    permissions: {
      canManageUsers: false,
      canDeleteUsers: false,
      canDeleteAdmins: false,
      canDeleteManagers: false,
      canManageAllHubs: false,
      canManageFleet: false,
      canDeleteMachines: false,
      canDispatch: false,
      canManagePricing: false,
      canManageLocations: false,
      canBook: true,
      canRefund: false,
      isReadOnly: false,
    },
  },
  guest: {
    id: 'usr-gst-05',
    name: 'Field Auditor / Viewer',
    email: 'guest.auditor@equipgrid.in',
    username: 'guest.auditor@equipgrid.in',
    role: 'guest',
    roleTitle: 'Guest (Read-Only Access)',
    hubLocation: 'All UP Hubs (Viewer)',
    avatarInitials: 'GA',
    permissions: {
      canManageUsers: false,
      canDeleteUsers: false,
      canDeleteAdmins: false,
      canDeleteManagers: false,
      canManageAllHubs: false,
      canManageFleet: false,
      canDeleteMachines: false,
      canDispatch: false,
      canManagePricing: false,
      canManageLocations: false,
      canBook: false,
      canRefund: false,
      isReadOnly: true,
    },
  },
};

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loginAsRole: (role: UserRole) => void;
  loginWithCredentials: (email: string, password?: string) => Promise<boolean>;
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
    // Unauthenticated by default — requires login
    return null;
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

  const loginWithCredentials = async (emailOrUsername: string, password?: string): Promise<boolean> => {
    const clean = emailOrUsername.toLowerCase().trim();

    // 1. Try backend authentication if available
    try {
      const res = await fetch('/equipgrid/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: clean,
          password: password || 'admin123',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.token) {
          const u = data.data;
          const roleStr = String(u.role).toUpperCase();
          const role: UserRole = roleStr === 'ROOT' ? 'root'
            : roleStr === 'ADMIN' ? 'admin'
            : roleStr === 'MANAGER' ? 'manager' : 'user';

          const authUser: AuthUser = {
            ...PRESET_USERS[role],
            id: String(u.userId),
            name: u.fullName || u.username,
            email: u.email || u.username,
            username: u.username,
            role,
            token: u.token,
            hubId: u.hubId,
            hubLocation: u.hubName || PRESET_USERS[role].hubLocation,
          };
          setCurrentUser(authUser);
          return true;
        }
      }
    } catch (err) {
      console.warn('Backend login fallback to preset users:', err);
    }

    // 2. Exact match against admin@equipgrid.in -> ROOT
    if (clean === 'admin@equipgrid.in' || clean === 'admin') {
      setCurrentUser(PRESET_USERS.root);
      return true;
    }

    // 3. Match against known preset users
    const foundUser = Object.values(PRESET_USERS).find(
      (u) => u.email.toLowerCase() === clean || u.username?.toLowerCase() === clean
    );

    if (foundUser) {
      setCurrentUser(foundUser);
      return true;
    }

    // 4. Determine role based on credentials / email prefix
    let role: UserRole = 'user';
    if (clean.includes('root')) {
      role = 'root';
    } else if (clean.includes('admin') || clean.includes('super') || clean.includes('hq')) {
      role = 'admin';
    } else if (clean.includes('manager') || clean.includes('yard') || clean.includes('lead')) {
      role = 'manager';
    }

    const fallback: AuthUser = {
      ...PRESET_USERS[role],
      id: `usr-${Date.now()}`,
      email: clean,
      name: clean.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Station Operator',
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
