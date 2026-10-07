import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  Building2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { UserAccount, StaffRole, CreateUserPayload, UpdateUserPayload, Hub } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { cn } from '../../lib/utils';

export const UserManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDaylight } = useTheme();

  const isRoot = currentUser?.role === 'root';
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [hubFilter, setHubFilter] = useState<string>(
    isManager && currentUser?.hubId ? String(currentUser.hubId) : 'ALL'
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    username: string;
    password: string;
    phone: string;
    role: StaffRole;
    hubId: string;
    active: boolean;
  }>({
    fullName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    role: isManager ? 'OPERATOR' : isAdmin ? 'MANAGER' : 'ADMIN',
    hubId: isManager && currentUser?.hubId ? String(currentUser.hubId) : '',
    active: true,
  });

  const normalizeRole = (role: any): StaffRole => {
    if (role === 8 || role === '8' || role === 'ROOT') return 'ROOT';
    if (role === 7 || role === '7' || role === 'ADMIN' || role === 1 || role === '1' || role === 'SUPER_ADMIN') return 'ADMIN';
    if (role === 6 || role === '6' || role === 'MANAGER') return 'MANAGER';
    if (role === 2 || role === '2' || role === 'OPERATOR') return 'OPERATOR';
    if (role === 3 || role === '3' || role === 'TECHNICIAN') return 'TECHNICIAN';
    if (role === 4 || role === '4' || role === 'DRIVER') return 'DRIVER';
    return (String(role || 'OPERATOR').toUpperCase() as StaffRole);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedHubs] = await Promise.all([
        api.getUsers(
          isManager && currentUser?.hubId ? currentUser.hubId : undefined
        ),
        api.getHubs(),
      ]);
      const normalizedUsers = (fetchedUsers || []).map((u) => ({
        ...u,
        role: normalizeRole(u.role),
      }));
      setUsers(normalizedUsers);
      setHubs(fetchedHubs);
    } catch (err) {
      console.error('Failed to load users or hubs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Scoped Users based on filters
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Hub Scoping: Managers can strictly only view users belonging to their hub
      if (isManager && currentUser?.hubId && u.hubId !== currentUser.hubId) {
        return false;
      }
      if (hubFilter !== 'ALL') {
        if (hubFilter === 'HQ' && u.hubId !== null) return false;
        if (hubFilter !== 'HQ' && String(u.hubId) !== hubFilter) return false;
      }

      // 2. Role Filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.fullName?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchUser = u.username?.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        const matchHub = u.hubName?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUser && !matchPhone && !matchHub) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, hubFilter, isManager, currentUser]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      roots: users.filter((u) => u.role === 'ROOT').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      managers: users.filter((u) => u.role === 'MANAGER').length,
      operators: users.filter(
        (u) => u.role === 'OPERATOR' || u.role === 'TECHNICIAN' || u.role === 'DRIVER'
      ).length,
    };
  }, [users]);

  // Permission Checks per Row
  const canEditUser = (target: UserAccount) => {
    if (isRoot) return true;
    if (isAdmin) {
      // Admin cannot edit Root or other Admins
      return target.role !== 'ROOT' && target.role !== 'ADMIN';
    }
    if (isManager) {
      // Manager can only edit staff in their assigned hub, not Root, Admin, or Manager
      return (
        target.hubId === currentUser?.hubId &&
        target.role !== 'ROOT' &&
        target.role !== 'ADMIN' &&
        target.role !== 'MANAGER'
      );
    }
    return false;
  };

  const canDeleteUser = (target: UserAccount) => {
    if (isRoot) {
      // Root can delete anyone except themselves
      return target.email !== currentUser?.email && target.username !== currentUser?.email;
    }
    if (isAdmin) {
      // Per User Requirement: "also crreate magaers update but not delete"
      // Admins CANNOT delete Managers!
      if (target.role === 'MANAGER') return false;
      if (target.role === 'ROOT' || target.role === 'ADMIN') return false;
      // Admin CAN delete operators/technicians/drivers
      return true;
    }
    if (isManager) {
      // Managers can only delete operators within their own hub
      return (
        target.hubId === currentUser?.hubId &&
        target.role !== 'ROOT' &&
        target.role !== 'ADMIN' &&
        target.role !== 'MANAGER'
      );
    }
    return false;
  };

  const getDeleteDisabledReason = (target: UserAccount): string => {
    if (target.email === currentUser?.email || target.username === currentUser?.email) {
      return 'You cannot delete your own active account';
    }
    if (isAdmin && target.role === 'MANAGER') {
      return 'Admins are prohibited from deleting Managers. Only Root has this privilege.';
    }
    if (isAdmin && (target.role === 'ROOT' || target.role === 'ADMIN')) {
      return 'Admins cannot delete other administrators or root users';
    }
    if (isManager && target.role === 'MANAGER') {
      return 'Managers cannot delete peer manager accounts';
    }
    if (isManager && (target.role === 'ROOT' || target.role === 'ADMIN')) {
      return 'Managers cannot delete system administrators';
    }
    return 'Insufficient permission to delete this user';
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setModalError(null);
    setFormData({
      fullName: '',
      email: '',
      username: '',
      password: '',
      phone: '',
      role: isManager ? 'OPERATOR' : isAdmin ? 'MANAGER' : 'ADMIN',
      hubId: isManager && currentUser?.hubId ? String(currentUser.hubId) : '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setModalError(null);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || user.username || '',
      username: user.username || '',
      password: '',
      phone: user.phone || '',
      role: user.role,
      hubId: user.hubId ? String(user.hubId) : '',
      active: user.active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.fullName.trim()) {
      setModalError('Please enter the full name.');
      return;
    }
    if (!formData.email.trim()) {
      setModalError('Please enter a valid email address.');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setModalError('A password is required for new accounts.');
      return;
    }
    if (formData.role === 'MANAGER' && !formData.hubId) {
      setModalError('A Hub Yard assignment is mandatory for Hub Managers.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: UpdateUserPayload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          hubId: formData.hubId ? Number(formData.hubId) : null,
          active: formData.active,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.updateUser(editingUser.id, payload);
      } else {
        const payload: CreateUserPayload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          username: formData.username.trim() || formData.email.trim(),
          password: formData.password.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          hubId: formData.hubId ? Number(formData.hubId) : null,
        };
        await api.createUser(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const getRoleBadge = (rawRole: any) => {
    const role = normalizeRole(rawRole);
    switch (role) {
      case 'ROOT':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border',
              isDaylight
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                : 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10'
            )}
          >
            <Crown className={cn('w-3.5 h-3.5', isDaylight ? 'text-amber-700' : 'text-amber-400')} />
            Root Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border',
              isDaylight
                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-sm'
                : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
            )}
          >
            <Shield className={cn('w-3.5 h-3.5', isDaylight ? 'text-indigo-700' : 'text-indigo-400')} />
            Operations Admin
          </span>
        );
      case 'MANAGER':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border',
              isDaylight
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-sm'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            )}
          >
            <Building2 className={cn('w-3.5 h-3.5', isDaylight ? 'text-emerald-700' : 'text-emerald-400')} />
            Yard Manager
          </span>
        );
      case 'OPERATOR':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border',
              isDaylight
                ? 'bg-sky-100 text-sky-900 border-sky-300 shadow-sm'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            )}
          >
            <KeyRound className={cn('w-3.5 h-3.5', isDaylight ? 'text-sky-700' : 'text-cyan-400')} />
            Desk Operator
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border',
              isDaylight
                ? 'bg-orange-100 text-orange-900 border-orange-300 shadow-sm'
                : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
            )}
          >
            Yard Technician
          </span>
        );
      case 'DRIVER':
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border',
              isDaylight
                ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm'
                : 'bg-violet-500/15 text-violet-400 border-violet-500/30'
            )}
          >
            Logistics Driver
          </span>
        );
      default:
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border',
              isDaylight
                ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            )}
          >
            {String(rawRole)}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-4">
      {/* ── Top Header & Role Banner ── */}
      <div
        className={cn(
          'p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all',
          isDaylight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-900/60 border-slate-800 text-white'
        )}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'p-2 rounded-lg border',
                isRoot
                  ? isDaylight
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : isAdmin
                  ? isDaylight
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : isDaylight
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              )}
            >
              {isRoot ? (
                <Crown className="w-6 h-6" />
              ) : isAdmin ? (
                <Shield className="w-6 h-6" />
              ) : (
                <Users className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className={cn('text-xl font-black tracking-tight flex items-center gap-2', isDaylight ? 'text-slate-900' : 'text-white')}>
                Staff & User Access Control
                <span
                  className={cn(
                    'text-xs font-mono font-medium px-2 py-0.5 rounded border',
                    isDaylight ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-700 bg-slate-800/50 text-slate-300'
                  )}
                >
                  RBAC Matrix Active
                </span>
              </h1>
              <p className={cn('text-xs mt-0.5', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
                {isRoot &&
                  'Root Authority: Full command over all roles, admins, managers, hubs & machines.'}
                {isAdmin &&
                  'Admin Authority: Full operational management across all hubs. Can create and update managers (manager deletion is restricted).'}
                {isManager &&
                  `Hub Manager: Scoped strictly to ${currentUser?.hubLocation || 'assigned yard'}. Can manage yard staff for this hub only.`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className={cn(
              'px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
              isDaylight
                ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            )}
            title="Refresh user list"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>

          {(isRoot || isAdmin || isManager) && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff / User
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metrics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        <div
          className={cn(
            'p-3 rounded-xl border flex flex-col',
            isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'
          )}
        >
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            Total Staff
          </span>
          <span className={cn('text-2xl font-black mt-1', isDaylight ? 'text-slate-900' : 'text-white')}>{stats.total}</span>
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex flex-col',
            isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'
          )}
        >
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1', isDaylight ? 'text-amber-700' : 'text-amber-500')}>
            <Crown className="w-3 h-3" /> Root Super
          </span>
          <span className={cn('text-2xl font-black mt-1', isDaylight ? 'text-amber-700' : 'text-amber-400')}>{stats.roots}</span>
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex flex-col',
            isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'
          )}
        >
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1', isDaylight ? 'text-indigo-700' : 'text-indigo-400')}>
            <Shield className="w-3 h-3" /> Admins
          </span>
          <span className={cn('text-2xl font-black mt-1', isDaylight ? 'text-indigo-700' : 'text-indigo-400')}>{stats.admins}</span>
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex flex-col',
            isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'
          )}
        >
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1', isDaylight ? 'text-emerald-700' : 'text-emerald-400')}>
            <Building2 className="w-3 h-3" /> Hub Managers
          </span>
          <span className={cn('text-2xl font-black mt-1', isDaylight ? 'text-emerald-700' : 'text-emerald-400')}>{stats.managers}</span>
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex flex-col col-span-2 sm:col-span-1',
            isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/50 border-slate-800'
          )}
        >
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1', isDaylight ? 'text-sky-700' : 'text-cyan-400')}>
            <KeyRound className="w-3 h-3" /> Yard Staff
          </span>
          <span className={cn('text-2xl font-black mt-1', isDaylight ? 'text-sky-700' : 'text-cyan-400')}>{stats.operators}</span>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div
        className={cn(
          'p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0',
          isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800'
        )}
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone..."
            className={cn(
              'w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-all',
              isDaylight
                ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
            )}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Role Filter */}
          <div className={cn('flex items-center gap-1.5 text-xs', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
            <Filter className="w-3.5 h-3.5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs outline-none',
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                  : 'border-slate-800 bg-slate-950 text-white'
              )}
            >
              <option value="ALL">All Roles</option>
              <option value="ROOT">Root (Super Admin)</option>
              <option value="ADMIN">Operations Admin</option>
              <option value="MANAGER">Hub Manager</option>
              <option value="OPERATOR">Desk Operator</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="DRIVER">Driver</option>
            </select>
          </div>

          {/* Hub Filter */}
          <div className={cn('flex items-center gap-1.5 text-xs', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
            <MapPin className="w-3.5 h-3.5" />
            <select
              value={hubFilter}
              disabled={isManager}
              onChange={(e) => setHubFilter(e.target.value)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs outline-none',
                isManager ? (isDaylight ? 'opacity-70 cursor-not-allowed bg-slate-100' : 'opacity-70 cursor-not-allowed bg-slate-800/40') : '',
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                  : 'border-slate-800 bg-slate-950 text-white'
              )}
            >
              {!isManager && <option value="ALL">All Hub Yards</option>}
              {!isManager && <option value="HQ">Central HQ (No Hub)</option>}
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Users Table ── */}
      <div
        className={cn(
          'flex-1 border rounded-xl overflow-hidden flex flex-col min-h-0',
          isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800'
        )}
      >
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead
              className={cn(
                'sticky top-0 z-10 border-b font-bold uppercase text-[10px] tracking-wider',
                isDaylight
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-slate-950/90 text-slate-400 border-slate-800'
              )}
            >
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Access Level</th>
                <th className="px-4 py-3">Assigned Yard / Hub</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn('divide-y', isDaylight ? 'divide-slate-200' : 'divide-slate-800/40')}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const editable = canEditUser(user);
                  const deletable = canDeleteUser(user);
                  const deleteReason = !deletable ? getDeleteDisabledReason(user) : '';

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'transition-colors',
                        isDaylight ? 'hover:bg-slate-50/80' : 'hover:bg-slate-800/30'
                      )}
                    >
                      {/* Name & Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 border',
                              user.role === 'ROOT'
                                ? isDaylight
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : user.role === 'ADMIN'
                                ? isDaylight
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : user.role === 'MANAGER'
                                ? isDaylight
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : user.role === 'OPERATOR'
                                ? isDaylight
                                  ? 'bg-sky-100 text-sky-900 border-sky-300'
                                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : isDaylight
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            )}
                          >
                            {user.fullName ? user.fullName.substring(0, 2) : 'ST'}
                          </div>
                          <div>
                            <div className={cn('font-bold flex items-center gap-1.5', isDaylight ? 'text-slate-900' : 'text-white')}>
                              {user.fullName}
                              {user.email === currentUser?.email && (
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold px-1 rounded border',
                                    isDaylight
                                      ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                  )}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div className={cn('text-[11px] flex items-center gap-1 font-mono', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                              <Mail className="w-3 h-3 opacity-60" />
                              {user.email || user.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Access Level Badge */}
                      <td className="px-4 py-3">{getRoleBadge(user.role)}</td>

                      {/* Assigned Hub */}
                      <td className="px-4 py-3">
                        {user.hubName ? (
                          <div className={cn('flex items-center gap-1.5 font-medium', isDaylight ? 'text-slate-800' : 'text-white')}>
                            <MapPin className={cn('w-3.5 h-3.5 shrink-0', isDaylight ? 'text-emerald-600' : 'text-emerald-400')} />
                            <span>{user.hubName}</span>
                            {user.hubCode && (
                              <span
                                className={cn(
                                  'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                                  isDaylight
                                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                )}
                              >
                                {user.hubCode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={cn('italic', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Central HQ / Global</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className={cn('px-4 py-3 font-mono', isDaylight ? 'text-slate-800' : 'text-slate-300')}>
                        {user.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className={isDaylight ? 'text-slate-400' : 'text-slate-500'}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {user.active ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                              isDaylight
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            )}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                              isDaylight
                                ? 'text-rose-800 bg-rose-50 border-rose-300'
                                : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                            )}
                          >
                            <XCircle className="w-3 h-3" /> Deactivated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editable ? (
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className={cn(
                                'p-1.5 rounded-lg border transition-all cursor-pointer',
                                isDaylight
                                  ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                                  : 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                              )}
                              title="Edit user details"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className={cn(
                                'p-1.5 rounded-lg border border-transparent opacity-40 cursor-not-allowed',
                                isDaylight ? 'text-slate-400' : 'text-slate-600'
                              )}
                              title="Cannot edit higher or peer privilege account"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {deletable ? (
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className={cn(
                                'p-1.5 rounded-lg border transition-all cursor-pointer',
                                isDaylight
                                  ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-sm'
                                  : 'border-rose-900/40 text-rose-400 hover:bg-rose-500/10'
                              )}
                              title="Delete staff account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span title={deleteReason}>
                              <button
                                disabled
                                className={cn(
                                  'p-1.5 rounded-lg border border-transparent opacity-40 cursor-not-allowed',
                                  isDaylight ? 'text-slate-400' : 'text-slate-600'
                                )}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit User Modal ── */}
      {isModalOpen && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
            isDaylight ? 'bg-slate-900/40' : 'bg-slate-950/80'
          )}
        >
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-6 shadow-2xl flex flex-col space-y-4 transition-all',
              isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            )}
          >
            <div className={cn('flex items-center justify-between pb-3 border-b', isDaylight ? 'border-slate-200' : 'border-slate-800')}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'p-2 rounded-lg border',
                    isDaylight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  )}
                >
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn('text-base font-bold', isDaylight ? 'text-slate-900' : 'text-white')}>
                    {editingUser ? 'Edit Staff Member' : 'Create New Staff Member'}
                  </h3>
                  <p className={cn('text-xs', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
                    Configure account credentials and role authorization
                  </p>
                </div>
              </div>
            </div>

            {modalError && (
              <div
                className={cn(
                  'p-3 rounded-lg border text-xs flex items-center gap-2',
                  isDaylight ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                )}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={cn('block font-semibold mb-1', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Vikramaditya Rao"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
                    )}
                  />
                </div>

                <div>
                  <label className={cn('block font-semibold mb-1', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. vikram@equipgrid.in"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
                    )}
                  />
                </div>

                <div>
                  <label className={cn('block font-semibold mb-1', isDaylight ? 'text-slate-700' : 'text-slate-300')}>Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+919876543210"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <label className={cn('block font-semibold mb-1', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                    {editingUser ? 'Change Password (Leave blank to keep unchanged)' : 'Account Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Enter temporary password'}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
                    )}
                  />
                </div>

                {/* Role Selector Scoped by RBAC */}
                <div>
                  <label className={cn('block font-semibold mb-1', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                    Access Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.role}
                    disabled={isManager} // Managers can only create Operators
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                        : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
                    )}
                  >
                    {isRoot && <option value="ROOT">👑 Root (Super Admin)</option>}
                    {isRoot && <option value="ADMIN">🛡️ Operations Admin</option>}
                    {(isRoot || isAdmin) && <option value="MANAGER">🏢 Hub Yard Manager</option>}
                    <option value="OPERATOR">⌨️ Station Desk Operator</option>
                    <option value="TECHNICIAN">🔧 Yard Technician</option>
                    <option value="DRIVER">🚚 Logistics Driver</option>
                  </select>
                </div>

                {/* Hub Selector Scoped by RBAC */}
                <div>
                  <label className={cn('block font-semibold mb-1', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                    Assigned Hub Yard {formData.role === 'MANAGER' && <span className="text-rose-400">*</span>}
                  </label>
                  <select
                    value={formData.hubId}
                    disabled={isManager} // Managers are permanently locked to their assigned hub
                    onChange={(e) => setFormData({ ...formData, hubId: e.target.value })}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all',
                      isManager ? (isDaylight ? 'opacity-70 bg-slate-100 cursor-not-allowed' : 'opacity-70 bg-slate-800/40 cursor-not-allowed') : '',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                        : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500'
                    )}
                  >
                    {!isManager && <option value="">Central HQ / Unassigned</option>}
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>

                {editingUser && (
                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="userActive"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className={cn(
                        'rounded focus:ring-0',
                        isDaylight ? 'border-slate-300 bg-white text-emerald-600' : 'border-slate-700 bg-slate-950 text-emerald-500'
                      )}
                    />
                    <label htmlFor="userActive" className={cn('text-xs cursor-pointer', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                      Account is Active and authorized to log in
                    </label>
                  </div>
                )}
              </div>

              <div className={cn('flex items-center justify-end gap-2.5 pt-4 border-t', isDaylight ? 'border-slate-200' : 'border-slate-800')}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    'px-4 py-2 rounded-lg border font-semibold cursor-pointer text-xs transition-all',
                    isDaylight
                      ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                      : 'border-slate-800 hover:bg-slate-800 text-slate-400'
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50 text-xs shadow-md shadow-emerald-900/20"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update Staff Member' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Deletion ── */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        variant="error"
        title={`Delete Account: ${deleteTarget?.fullName || deleteTarget?.username}`}
        message={`Are you sure you want to permanently delete ${deleteTarget?.fullName} (${deleteTarget?.email}) with role ${deleteTarget?.role}? This action cannot be undone.`}
        confirmLabel="Confirm Delete"
        showCancel={true}
      />
    </div>
  );
};
