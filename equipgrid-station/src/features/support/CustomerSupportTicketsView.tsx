import React, { useState, useEffect, useMemo } from 'react';
import {
  Headphones,
  Search,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  CalendarCheck,
  Send,
  X,
  AlertCircle,
  User,
  MapPin,
  Tag,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { cn, formatDate } from '../../lib/utils';
import { api } from '../../services/api';
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from '../../types';
import { SearchSelect, SelectOption } from '../../components/SearchSelect';

const SUPPORT_STATUS_MAP: Record<string, { label: string; desc: string }> = {
  ALL: { label: 'All Tickets', desc: 'सभी पूछताछ' },
  OPEN: { label: 'Open', desc: 'नई पूछताछ' },
  IN_DISCUSSION: { label: 'In Discussion', desc: 'बातचीत जारी' },
  IN_PROGRESS: { label: 'In Progress', desc: 'प्रक्रियाधीन' },
  RESOLVED: { label: 'Resolved', desc: 'हल किया गया' },
  CLOSED: { label: 'Closed', desc: 'बंद किया गया' },
};

const SOURCE_FILTER_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Sources (सभी स्रोत)' },
  { value: 'WEBSITE', label: 'Website Contact (वेबसाइट फॉर्म)' },
  { value: 'AVAILABILITY_FALLBACK', label: 'Availability Waitlist (अनुपलब्धता टिकट)' },
];

const TICKET_STATUS_MODAL_OPTIONS: SelectOption[] = [
  { value: 'OPEN', label: 'Open (नई पूछताछ / ओपन)' },
  { value: 'IN_DISCUSSION', label: 'In Discussion (ग्राहक से बातचीत जारी)' },
  { value: 'IN_PROGRESS', label: 'In Progress (मशीन आवंटन प्रक्रियाधीन)' },
  { value: 'RESOLVED', label: 'Resolved (हल किया गया - बुकिंग संपन्न)' },
  { value: 'CLOSED', label: 'Closed (टिकट बंद किया गया)' },
];

interface CustomerSupportTicketsViewProps {
  onNavigateToBooking?: (tab: string) => void;
}

export const CustomerSupportTicketsView: React.FC<CustomerSupportTicketsViewProps> = ({
  onNavigateToBooking,
}) => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>(api.supportTickets);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Status update modal state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newStatus, setNewStatus] = useState<SupportTicketStatus>('IN_PROGRESS');
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [validationError, setValidationError] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.fetchSupportTickets();
      setTickets(res);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    return api.subscribe(() => {
      setTickets(api.supportTickets);
    });
  }, []);

  const openStatusModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setRemarks(ticket.statusRemarks || '');
    setValidationError('');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    if (
      (newStatus === 'RESOLVED' || newStatus === 'CLOSED') &&
      !remarks.trim()
    ) {
      setValidationError('अनिवार्य: टिकट को बंद या हल (RESOLVED/CLOSED) करने हेतु कारण/विवरण दर्ज करना अनिवार्य है।');
      return;
    }

    setUpdating(true);
    setValidationError('');
    try {
      await api.updateSupportTicketStatus(
        selectedTicket.id,
        newStatus,
        remarks.trim(),
        currentUser?.name || 'Station Ops',
      );
      setSelectedTicket(null);
      await loadTickets();
    } catch (err: any) {
      setValidationError(err.message || 'Status update failed.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (sourceFilter !== 'ALL') {
        if (sourceFilter === 'AVAILABILITY_FALLBACK') {
          if (!t.source?.includes('AVAILABILITY')) return false;
        } else if (sourceFilter === 'WEBSITE') {
          if (t.source?.includes('AVAILABILITY')) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.customerName?.toLowerCase().includes(q) ||
          t.phoneNumber?.includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.message?.toLowerCase().includes(q) ||
          t.district?.toLowerCase().includes(q) ||
          t.villageOrCity?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, sourceFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const openCount = tickets.filter((t) => t.status === 'OPEN').length;
    const inDiscussionCount = tickets.filter(
      (t) => t.status === 'IN_DISCUSSION' || t.status === 'IN_PROGRESS',
    ).length;
    const availabilityCount = tickets.filter((t) =>
      t.source?.includes('AVAILABILITY'),
    ).length;
    const resolvedCount = tickets.filter(
      (t) => t.status === 'RESOLVED' || t.status === 'CLOSED',
    ).length;
    return { total, openCount, inDiscussionCount, availabilityCount, resolvedCount };
  }, [tickets]);

  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Open (नई पूछताछ)',
          className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        };
      case 'IN_DISCUSSION':
        return {
          label: 'In Discussion (बातचीत जारी)',
          className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress (प्रक्रियाधीन)',
          className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        };
      case 'RESOLVED':
        return {
          label: 'Resolved (हल किया गया)',
          className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        };
      case 'CLOSED':
        return {
          label: 'Closed (बंद किया गया)',
          className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        };
    }
  };

  const getPriorityBadge = (priority: SupportTicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/15 text-red-500 border-red-500/30 font-black';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-bold';
      case 'NORMAL':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'LOW':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2
            className={cn(
              'text-lg sm:text-xl font-extrabold flex items-center gap-2',
              isDaylight ? 'text-slate-950' : 'text-white',
            )}
          >
            <Headphones className="h-5 w-5 text-emerald-500" />
            Customer Support & Inquiries (ग्राहक सहायता व पूछताछ)
          </h2>
          <p className={cn('text-xs mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            Incoming contact form leads and automated capacity fallback tickets when equipment is unavailable
          </p>
        </div>

        <button
          onClick={loadTickets}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0">
        <div
          className={cn(
            'rounded-xl border p-3',
            isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/50',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Enquiries</span>
          <div className={cn('text-xl font-black mt-0.5', isDaylight ? 'text-slate-950' : 'text-white')}>
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">All customer inquiries</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 border-amber-500/30',
            isDaylight ? 'bg-amber-500/5 shadow-sm' : 'bg-amber-500/10',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
            Open / Pending Calls
          </span>
          <div className="text-xl font-black text-amber-500 mt-0.5">{stats.openCount}</div>
          <p className="text-[11px] text-amber-500/80 mt-0.5">Require agent callback</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 border-red-500/30',
            isDaylight ? 'bg-red-500/5 shadow-sm' : 'bg-red-500/10',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
            Availability Waitlist
          </span>
          <div className="text-xl font-black text-red-500 mt-0.5">{stats.availabilityCount}</div>
          <p className="text-[11px] text-red-500/80 mt-0.5">Machines currently on rent</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 border-emerald-500/30',
            isDaylight ? 'bg-emerald-500/5 shadow-sm' : 'bg-emerald-500/10',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            Resolved / Converted
          </span>
          <div className="text-xl font-black text-emerald-500 mt-0.5">{stats.resolvedCount}</div>
          <p className="text-[11px] text-emerald-500/80 mt-0.5">Converted or resolved</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div
        className={cn(
          'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl border flex-shrink-0',
          isDaylight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800',
        )}
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, customer name, phone, subject, village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-amber-500',
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-white',
            )}
          />
        </div>

        {/* Status Filters with descriptive names */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {(['ALL', 'OPEN', 'IN_DISCUSSION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((st) => {
            const meta = SUPPORT_STATUS_MAP[st];
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer text-xs flex items-center gap-1',
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : isDaylight
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )}
              >
                <span>{meta?.label || st}</span>
                <span className={cn('text-[10px] font-normal opacity-80', statusFilter === st ? 'text-slate-950 font-semibold' : '')}>
                  ({meta?.desc})
                </span>
              </button>
            );
          })}
        </div>

        {/* Source Filter with React-Select (SearchSelect) */}
        <div className="w-full sm:w-64 flex-shrink-0">
          <SearchSelect
            options={SOURCE_FILTER_OPTIONS}
            value={sourceFilter}
            onChange={(val) => setSourceFilter(val ? String(val) : 'ALL')}
            isClearable={false}
            isSearchable={false}
            placeholder="All Sources (सभी स्रोत)"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredTickets.length === 0 ? (
          <div
            className={cn(
              'p-8 rounded-2xl border text-center my-6',
              isDaylight ? 'border-slate-200 bg-white text-slate-500' : 'border-slate-800 bg-slate-900/30 text-slate-400',
            )}
          >
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-60" />
            <h4 className="text-sm font-bold">No Support Tickets Found</h4>
            <p className="text-xs text-slate-500 mt-1">
              No inquiries match your selected filter criteria.
            </p>
          </div>
        ) : (
          filteredTickets.map((t) => {
            const badge = getStatusBadge(t.status);
            const isAvailabilityTicket = t.source?.includes('AVAILABILITY');

            return (
              <div
                key={t.id}
                className={cn(
                  'rounded-xl border p-3.5 transition-all flex flex-col gap-2.5',
                  isDaylight
                    ? 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700',
                  isAvailabilityTicket && (isDaylight ? 'border-amber-200 bg-amber-50/20' : 'border-amber-500/20'),
                )}
              >
                {/* Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {t.ticketNumber}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase px-2 py-0.5 rounded border',
                        getPriorityBadge(t.priority),
                      )}
                    >
                      {t.priority}
                    </span>
                    {isAvailabilityTicket ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Machine Waitlist / Unavailable</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {t.category || 'Website Inquiry'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {t.createdAt ? formatDate(t.createdAt) : ''}
                    </span>
                  </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Customer Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <User className="h-3.5 w-3.5 text-amber-500" />
                      <span className={isDaylight ? 'text-slate-900' : 'text-white'}>{t.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <a
                        href={`tel:${t.phoneNumber}`}
                        className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 font-mono font-bold"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{t.phoneNumber}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${t.phoneNumber}?text=${encodeURIComponent(
                          `नमस्ते ${t.customerName} जी, EquipGrid से हम आपकी पूछताछ (${t.ticketNumber}) के संबंध में संपर्क कर रहे हैं।`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[10px] font-bold"
                      >
                        WhatsApp
                      </a>
                    </div>
                    {(t.villageOrCity || t.district) && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        <span>
                          {[t.villageOrCity, t.district].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Subject & Message */}
                  <div className="md:col-span-2 space-y-1.5">
                    <div className={cn('text-xs font-bold', isDaylight ? 'text-slate-900' : 'text-slate-100')}>
                      {t.subject}
                    </div>
                    {t.message && (
                      <p
                        className={cn(
                          'text-xs leading-relaxed p-2 rounded-lg border',
                          isDaylight
                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300',
                        )}
                      >
                        {t.message}
                      </p>
                    )}
                    {t.statusRemarks && (
                      <div className="text-[11px] p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500">
                        <span className="font-bold">Resolution Remarks: </span>
                        {t.statusRemarks}
                        {t.resolvedBy && <span className="text-slate-400"> (By {t.resolvedBy})</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                  {onNavigateToBooking && (
                    <button
                      onClick={() => onNavigateToBooking('booking')}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white"
                    >
                      <CalendarCheck className="h-3.5 w-3.5 text-amber-500" />
                      <span>Check Booking Desk</span>
                    </button>
                  )}

                  <button
                    onClick={() => openStatusModal(t)}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-sm"
                  >
                    <span>Update Status (स्थिति बदलें)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Status Update Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-5 shadow-2xl space-y-4',
              isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white',
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-emerald-500" />
                  Update Ticket: {selectedTicket.ticketNumber}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customer: {selectedTicket.customerName} ({selectedTicket.phoneNumber})
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Ticket Status (टिकट की स्थिति) <span className="text-red-500">*</span>
                </label>
                <SearchSelect
                  options={TICKET_STATUS_MODAL_OPTIONS}
                  value={newStatus}
                  onChange={(val) => setNewStatus(val as SupportTicketStatus)}
                  isClearable={false}
                  isSearchable={false}
                  placeholder="Select status..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold">
                    Remarks & Action Taken (टिप्पणी / समाधान विवरण)
                    {(newStatus === 'RESOLVED' || newStatus === 'CLOSED') && (
                      <span className="text-red-500 ml-1 font-black">* (अनिवार्य)</span>
                    )}
                  </label>
                  {(newStatus === 'RESOLVED' || newStatus === 'CLOSED') && (
                    <span className="text-[10px] text-amber-500 font-bold">
                      कारण लिखना अनिवार्य है
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  placeholder={
                    newStatus === 'RESOLVED' || newStatus === 'CLOSED'
                      ? 'उदा. ग्राहक से बात हुई, बुकिंग ID #129 पर मशीन कन्फर्म की गई या ग्राहक ने बाद की तारीख के लिए कहा...'
                      : 'अतिरिक्त नोट्स या फॉलो-अप विवरण दर्ज करें...'
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={cn(
                    'w-full rounded-xl border p-2.5 text-xs focus:outline-none focus:border-amber-500',
                    (newStatus === 'RESOLVED' || newStatus === 'CLOSED') && !remarks.trim()
                      ? 'border-amber-500/80 bg-amber-500/5'
                      : isDaylight
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-slate-700 bg-slate-950 text-white',
                  )}
                />
              </div>

              {validationError && (
                <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {updating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm Status Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
