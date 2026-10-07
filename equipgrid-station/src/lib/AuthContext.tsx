import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'root' | 'admin' | 'manager' | 'user' | 'guest';

export interface UserPermissions {
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
}

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
  permissions: UserPermissions;
}

export function getRolePermissions(role: UserRole): UserPermissions {
  if (role === 'root') {
    return {
      canManageUsers: true,
      canDeleteUsers: true,
      canDeleteAdmins: true,
      canDeleteManagers: true,
      canManageAllHubs: true,
      canManageFleet: true,
      canDeleteMachines: true, // Only Root can delete machinery
      canDispatch: true,
      canManagePricing: true,
      canManageLocations: true,
      canBook: true,
      canRefund: true,
      isReadOnly: false,
    };
  }
  if (role === 'admin') {
    return {
      canManageUsers: true,
      canDeleteUsers: true,
      canDeleteAdmins: false,
      canDeleteManagers: false, // Per SOP: Admins cannot delete Managers
      canManageAllHubs: true,
      canManageFleet: true,
      canDeleteMachines: false, // Per SOP: Admins cannot delete Machinery
      canDispatch: true,
      canManagePricing: true,
      canManageLocations: true,
      canBook: true,
      canRefund: true,
      isReadOnly: false,
    };
  }
  if (role === 'manager') {
    return {
      canManageUsers: true, // Scoped to assigned Hub only
      canDeleteUsers: true, // Scoped to assigned Hub only
      canDeleteAdmins: false,
      canDeleteManagers: false,
      canManageAllHubs: false, // Strictly scoped to assigned Hub
      canManageFleet: false,
      canDeleteMachines: false,
      canDispatch: true,
      canManagePricing: false,
      canManageLocations: false,
      canBook: true,
      canRefund: true,
      isReadOnly: false,
    };
  }
  if (role === 'guest') {
    return {
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
    };
  }
  // Default operator / user
  return {
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
  };
}

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
    // Only guest is allowed without DB credentials for public machinery catalog browsing
    if (role === 'guest') {
      const guestUser: AuthUser = {
        id: 'guest',
        name: 'Guest Viewer',
        email: 'guest@equipgrid.in',
        username: 'guest',
        role: 'guest',
        roleTitle: 'Guest (Catalog Read-Only)',
        hubId: null,
        hubLocation: 'All UP Hubs (Viewer)',
        avatarInitials: 'GV',
        permissions: getRolePermissions('guest'),
      };
      setCurrentUser(guestUser);
    }
  };

  const loginWithCredentials = async (emailOrUsername: string, password?: string): Promise<boolean> => {
    const clean = emailOrUsername.toLowerCase().trim();

    // 100% Database-Driven: Must authenticate via Spring Boot backend /auth/login connected to PostgreSQL
    const res = await fetch('/equipgrid/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: clean,
        password: password || '',
      }),
    });

    if (!res.ok) {
      let errMsg = 'Invalid username or password';
      try {
        const errData = await res.json();
        if (errData?.message?.text) errMsg = errData.message.text;
        else if (errData?.message) errMsg = typeof errData.message === 'string' ? errData.message : JSON.stringify(errData.message);
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const json = await res.json();
    const data = json?.data;
    if (!data || !data.token) {
      throw new Error('Authentication failed: Missing authorization token from database');
    }

    // Map role strictly from DB enum
    const roleStr = String(data.role).toUpperCase();
    const role: UserRole =
      (roleStr === 'ROOT' || roleStr === '8') ? 'root'
      : (roleStr === 'ADMIN' || roleStr === '7' || roleStr === '1') ? 'admin'
      : (roleStr === 'MANAGER' || roleStr === '6') ? 'manager'
      : 'user';

    const roleTitle =
      role === 'root' ? 'Root Super Admin'
      : role === 'admin' ? 'Operations Admin'
      : role === 'manager' ? 'Yard Manager'
      : 'Station Desk Operator';

    const authUser: AuthUser = {
      id: String(data.userId),
      name: data.fullName || data.username,
      email: data.email || data.username,
      username: data.username,
      role,
      roleTitle,
      hubId: data.hubId || null,
      hubLocation: data.hubName || (role === 'root' || role === 'admin' ? 'Central HQ / Global' : 'Unassigned Hub'),
      avatarInitials: data.fullName ? data.fullName.substring(0, 2).toUpperCase() : 'ST',
      token: data.token,
      permissions: getRolePermissions(role),
    };

    setCurrentUser(authUser);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchRole = (_role: UserRole) => {
    // In production, role switching is disabled; roles are strictly governed by DB user records
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
