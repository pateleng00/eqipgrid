import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { DealerLead, DealerLeadStatus } from '../../types';
import { SearchSelect, SelectOption } from '../../components/SearchSelect';

const DEALER_LEAD_STATUS_MAP: Record<string, { label: string; desc: string }> = {
  ALL: { label: 'All Leads', desc: 'सभी लीड्स' },
  ENQUIRY: { label: 'Enquiry', desc: 'नई पूछताछ' },
  IN_DISCUSSION: { label: 'In Discussion', desc: 'बातचीत जारी' },
  IN_DOCUMENTATION: { label: 'Documentation', desc: 'दस्तावेज जांच' },
  ONBOARDED: { label: 'Onboarded', desc: 'ऑनबोर्डेड' },
  DENIED: { label: 'Denied', desc: 'अस्वीकृत' },
  CLOSED: { label: 'Closed', desc: 'बंद किया गया' },
};

const DEALER_LEAD_MODAL_OPTIONS: SelectOption[] = [
  { value: 'ENQUIRY', label: 'Enquiry', subLabel: 'नई पूछताछ / शुरूआती जांच' },
  { value: 'IN_DISCUSSION', label: 'In Discussion', subLabel: 'मशीन मालिक से बातचीत जारी' },
  { value: 'IN_DOCUMENTATION', label: 'Documentation', subLabel: 'दस्तावेज व मशीन निरीक्षण' },
  { value: 'ONBOARDED', label: 'Onboarded', subLabel: 'स्वीकृत व नेटवर्क में शामिल' },
  { value: 'DENIED', label: 'Denied', subLabel: 'अस्वीकृत - कारण लिखना अनिवार्य' },
  { value: 'CLOSED', label: 'Closed', subLabel: 'लीड बंद की गई - कारण लिखना अनिवार्य' },
];

interface DealerLeadsViewProps {
  onNavigateToDealers?: () => void;
}

export const DealerLeadsView: React.FC<DealerLeadsViewProps> = ({ onNavigateToDealers }) => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();

  const [dealerLeads, setDealerLeads] = useState<DealerLead[]>(api.dealerLeads);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<string>('ALL');
  const [leadsDistrictFilter, setLeadsDistrictFilter] = useState<string>('ALL');

  // Lead status update modal state
  const [selectedLead, setSelectedLead] = useState<DealerLead | null>(null);
  const [newLeadStatus, setNewLeadStatus] = useState<DealerLeadStatus>('IN_DISCUSSION');
  const [leadRemarks, setLeadRemarks] = useState('');
  const [updatingLead, setUpdatingLead] = useState(false);
  const [leadValidationError, setLeadValidationError] = useState('');

  const loadLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await api.fetchDealerLeads();
      setDealerLeads(res);
    } catch (err) {
      console.error('Failed to load dealer leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    setDealerLeads(api.dealerLeads);
    return api.subscribe(() => {
      setDealerLeads(api.dealerLeads);
    });
  }, []);

  // Distinct districts from leads for filter dropdown
  const uniqueDistricts = useMemo(() => {
    const districts = new Set<string>();
    dealerLeads.forEach((l) => {
      if (l.district && l.district.trim()) {
        districts.add(l.district.trim());
      }
    });
    return Array.from(districts).sort();
  }, [dealerLeads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return dealerLeads.filter((lead) => {
      if (leadsStatusFilter !== 'ALL' && lead.status !== leadsStatusFilter) {
        return false;
      }
      if (leadsDistrictFilter !== 'ALL' && lead.district !== leadsDistrictFilter) {
        return false;
      }
      if (leadsSearch.trim()) {
        const query = leadsSearch.toLowerCase();
        const matchName = lead.fullName?.toLowerCase().includes(query);
        const matchPhone = lead.phoneNumber?.includes(query);
        const matchMachinery = lead.machineryOwned?.toLowerCase().includes(query);
        const matchVillage = lead.villageOrArea?.toLowerCase().includes(query);
        const matchDistrict = lead.district?.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchMachinery && !matchVillage && !matchDistrict) {
          return false;
        }
      }
      return true;
    });
  }, [dealerLeads, leadsStatusFilter, leadsDistrictFilter, leadsSearch]);

  // Quick stats
  const leadsStats = useMemo(() => {
    const total = dealerLeads.length;
    const enquiryCount = dealerLeads.filter((l) => l.status === 'ENQUIRY').length;
    const inProgressCount = dealerLeads.filter(
      (l) => l.status === 'IN_DISCUSSION' || l.status === 'IN_DOCUMENTATION',
    ).length;
    const onboardedCount = dealerLeads.filter((l) => l.status === 'ONBOARDED').length;
    return { total, enquiryCount, inProgressCount, onboardedCount };
  }, [dealerLeads]);

  const openLeadStatusModal = (lead: DealerLead) => {
    setSelectedLead(lead);
    setNewLeadStatus(lead.status);
    setLeadRemarks(lead.statusRemarks || '');
    setLeadValidationError('');
  };

  const handleUpdateLeadStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if ((newLeadStatus === 'DENIED' || newLeadStatus === 'CLOSED') && !leadRemarks.trim()) {
      setLeadValidationError('Please provide a mandatory reason / remark when marking lead as DENIED or CLOSED.');
      return;
    }

    setUpdatingLead(true);
    setLeadValidationError('');
    try {
      await api.updateDealerLeadStatus(
        selectedLead.id,
        newLeadStatus,
        leadRemarks.trim(),
        currentUser?.name || 'Station Manager',
      );
      setSelectedLead(null);
      await loadLeads();
    } catch (err: any) {
      setLeadValidationError(err.message || 'Failed to update lead status. Please try again.');
    } finally {
      setUpdatingLead(false);
    }
  };

  const getLeadStatusBadge = (status: DealerLeadStatus) => {
    switch (status) {
      case 'ENQUIRY':
        return {
          label: 'Enquiry (नई पूछताछ)',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'IN_DISCUSSION':
        return {
          label: 'In Discussion (बातचीत जारी)',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'IN_DOCUMENTATION':
        return {
          label: 'In Documentation (दस्तावेज जांच)',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'ONBOARDED':
        return {
          label: 'Onboarded (ऑनबोर्डेड)',
          className: 'bg-[#DCFCE7] text-[#15803D] border-emerald-200 font-bold',
        };
      case 'DENIED':
        return {
          label: 'Denied (अस्वीकृत)',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'CLOSED':
        return {
          label: 'Closed (बंद किया गया)',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Top Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2
            className={cn(
              'text-lg sm:text-xl font-black flex items-center gap-2',
              isDaylight ? 'text-[#1E293B]' : 'text-white',
            )}
          >
            <TrendingUp className="h-5 w-5 text-[#0D5C46]" />
            <span>Machinery Host Leads (मशीन मालिक व पार्टनर लीड्स)</span>
          </h2>
          <p className={cn('text-xs mt-0.5', isDaylight ? 'text-[#64748B]' : 'text-slate-400')}>
            Tractor, Harvester, Pump, and Excavator owners who submitted partner onboarding requests from the website
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToDealers && (
            <button
              onClick={onNavigateToDealers}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 transition-all"
            >
              View Active Dealers →
            </button>
          )}

          <button
            onClick={loadLeads}
            disabled={leadsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#E2E8F0] hover:bg-slate-100 text-[#1E293B] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', leadsLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Leads Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0">
        <div
          className={cn(
            'rounded-xl border p-3',
            isDaylight ? 'border-[#E2E8F0] bg-white shadow-xs' : 'border-slate-800 bg-slate-900/40',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Total Host Leads</span>
          <div className={cn('text-xl font-black mt-0.5', isDaylight ? 'text-[#1E293B]' : 'text-white')}>
            {leadsStats.total} Leads
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Website registrations</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 border-blue-200',
            isDaylight ? 'bg-blue-50/50 shadow-xs' : 'bg-blue-500/10 border-blue-500/30',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">New Enquiries (नई पूछताछ)</span>
          <div className="text-xl font-black text-blue-800 mt-0.5">{leadsStats.enquiryCount}</div>
          <p className="text-[11px] text-blue-600 mt-0.5">Awaiting initial verification</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 border-purple-200',
            isDaylight ? 'bg-purple-50/50 shadow-xs' : 'bg-purple-500/10 border-purple-500/30',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
            In Verification / Docs
          </span>
          <div className="text-xl font-black text-purple-800 mt-0.5">{leadsStats.inProgressCount}</div>
          <p className="text-[11px] text-purple-600 mt-0.5">Discussion & documentation</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3 border-emerald-200',
            isDaylight ? 'bg-[#DCFCE7]/40 shadow-xs' : 'bg-emerald-500/10 border-emerald-500/30',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
            Onboarded as Partners
          </span>
          <div className="text-xl font-black text-[#15803D] mt-0.5">{leadsStats.onboardedCount}</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Approved & active in network</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className={cn(
          'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border flex-shrink-0',
          isDaylight ? 'bg-white border-[#E2E8F0] shadow-xs' : 'bg-slate-900/60 border-slate-800',
        )}
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search owner name, phone, machinery, village, district..."
            value={leadsSearch}
            onChange={(e) => setLeadsSearch(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#0D5C46] focus:border-[#0D5C46]',
              isDaylight
                ? 'bg-slate-50 border-[#E2E8F0] text-[#1E293B]'
                : 'bg-slate-950 border-slate-800 text-white',
            )}
          />
        </div>

        {/* Status Filter Buttons with descriptive names */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {(['ALL', 'ENQUIRY', 'IN_DISCUSSION', 'IN_DOCUMENTATION', 'ONBOARDED', 'DENIED', 'CLOSED'] as const).map(
            (st) => {
              const meta = DEALER_LEAD_STATUS_MAP[st];
              return (
                <button
                  key={st}
                  onClick={() => setLeadsStatusFilter(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer text-xs flex items-center gap-1',
                    leadsStatusFilter === st
                      ? 'bg-[#0D5C46] text-white shadow-xs'
                      : isDaylight
                      ? 'text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B]'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <span>{meta?.label || st}</span>
                  <span className={cn('text-[10px] font-normal opacity-80', leadsStatusFilter === st ? 'text-emerald-100 font-semibold' : '')}>
                    ({meta?.desc})
                  </span>
                </button>
              );
            },
          )}
        </div>

        {/* District Filter Dropdown using React-Select (SearchSelect) */}
        {uniqueDistricts.length > 0 && (
          <div className="w-full sm:w-56 flex-shrink-0">
            <SearchSelect
              options={[
                { value: 'ALL', label: `All Districts (${uniqueDistricts.length})`, subLabel: 'सभी जिले' },
                ...uniqueDistricts.map((d) => ({ value: d, label: d })),
              ]}
              value={leadsDistrictFilter}
              onChange={(val) => setLeadsDistrictFilter(val ? String(val) : 'ALL')}
              isClearable={false}
              isSearchable={true}
              placeholder="All Districts..."
            />
          </div>
        )}
      </div>

      {/* Leads Grid */}
      <div
        className={cn(
          'flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col',
          isDaylight ? 'border-[#E2E8F0] bg-white' : 'border-slate-800 bg-slate-900/40',
        )}
      >
        <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <TrendingUp className="h-10 w-10 text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-500">
                No machinery owner leads found matching selected filter criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredLeads.map((lead) => {
                const badge = getLeadStatusBadge(lead.status);

                return (
                  <div
                    key={lead.id}
                    className={cn(
                      'rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all shadow-xs',
                      isDaylight
                        ? 'border-[#E2E8F0] bg-white hover:border-[#0D5C46]/40'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                    )}
                  >
                    {/* Top: Name & Status */}
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-[#E2E8F0] dark:border-slate-800/80 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className={cn('font-black text-sm', isDaylight ? 'text-[#1E293B]' : 'text-white')}>
                              {lead.fullName}
                            </h3>
                            <span className="font-mono text-[10px] text-[#64748B]">#{lead.id}</span>
                          </div>
                          <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-[#0D5C46] shrink-0" />
                            <span>
                              {[lead.villageOrArea, lead.tehsilOrBlock, lead.district].filter(Boolean).join(', ')}
                            </span>
                          </p>
                        </div>

                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap',
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Machine & Commercial Details */}
                      <div className="space-y-1.5 text-xs py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Machinery:</span>
                          <span className="font-bold text-[#1E293B] dark:text-slate-200">
                            {lead.machineryOwned} ({lead.machineryCount} unit{lead.machineryCount > 1 ? 's' : ''})
                          </span>
                        </div>

                        {lead.makeModelYear && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#64748B]">Model / Make:</span>
                            <span className="font-medium text-[#1E293B] dark:text-slate-300">{lead.makeModelYear}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B]">Operator:</span>
                          <span
                            className={cn(
                              'font-bold px-1.5 py-0.5 rounded text-[10px]',
                              lead.operatorAvailable
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : 'bg-[#F1F5F9] text-[#334155]',
                            )}
                          >
                            {lead.operatorAvailable ? 'Available (उपलब्ध है)' : 'No Operator'}
                          </span>
                        </div>

                        {lead.expectedMonthlyIncome && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#64748B]">Expected Income:</span>
                            <span className="font-bold text-[#0D5C46] font-mono">
                              {lead.expectedMonthlyIncome}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1.5 border-t border-[#E2E8F0] dark:border-slate-800/80">
                          <span className="text-[#64748B]">Phone:</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${lead.phoneNumber}`}
                              className="font-mono font-bold text-[#0D5C46] hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{lead.phoneNumber}</span>
                            </a>
                            <a
                              href={`https://wa.me/91${lead.phoneNumber}?text=${encodeURIComponent(
                                `नमस्ते ${lead.fullName} जी, EquipGrid से आपकी मशीन (${lead.machineryOwned}) को नेटवर्क पर जोड़ने के संबंध में हम आपसे संपर्क कर रहे हैं।`,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-200"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </div>

                        {lead.statusRemarks && (
                          <div className="mt-2 text-[11px] p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                            <span className="font-bold">Remarks: </span>
                            {lead.statusRemarks}
                            {lead.reviewedBy && <span className="text-slate-500"> (by {lead.reviewedBy})</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                      <button
                        onClick={() => openLeadStatusModal(lead)}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-bold border border-[#E2E8F0] hover:bg-slate-100 text-[#1E293B] transition-all text-center dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Update Status (स्थिति बदलें)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* LEAD STATUS UPDATE MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-5 shadow-2xl space-y-4',
              isDaylight ? 'bg-white border-[#E2E8F0] text-[#1E293B]' : 'bg-slate-900 border-slate-800 text-white',
            )}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#0D5C46]" />
                  Update Host Lead Status: {selectedLead.fullName}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Phone: {selectedLead.phoneNumber} • Machinery: {selectedLead.machineryOwned}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLeadStatus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Review Status (सत्यापन स्थिति) <span className="text-red-500">*</span>
                </label>
                <SearchSelect
                  options={DEALER_LEAD_MODAL_OPTIONS}
                  value={newLeadStatus}
                  onChange={(val) => setNewLeadStatus(val as DealerLeadStatus)}
                  isClearable={false}
                  isSearchable={false}
                  placeholder="Select status..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold">
                    Remarks & Verification Notes (सत्यापन टिप्पणी / कारण)
                    {(newLeadStatus === 'DENIED' || newLeadStatus === 'CLOSED') && (
                      <span className="text-red-500 ml-1 font-black">* (अनिवार्य)</span>
                    )}
                  </label>
                  {(newLeadStatus === 'DENIED' || newLeadStatus === 'CLOSED') && (
                    <span className="text-[10px] text-amber-700 font-bold">
                      अस्वीकृत या बंद करने का कारण लिखना जरूरी है
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  placeholder={
                    newLeadStatus === 'DENIED' || newLeadStatus === 'CLOSED'
                      ? 'उदा. मशीन की हालत संतोषजनक नहीं है, या मालिक ने मना कर दिया, या दरें मेल नहीं खाती हैं...'
                      : 'अतिरिक्त नोट्स दर्ज करें (उदा. अगले सप्ताह बिलग्राम यार्ड पर मशीन का निरीक्षण तय हुआ)...'
                  }
                  value={leadRemarks}
                  onChange={(e) => setLeadRemarks(e.target.value)}
                  className={cn(
                    'w-full rounded-xl border p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0D5C46]',
                    (newLeadStatus === 'DENIED' || newLeadStatus === 'CLOSED') && !leadRemarks.trim()
                      ? 'border-amber-400 bg-amber-50/50'
                      : isDaylight
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-slate-700 bg-slate-950 text-white',
                  )}
                />
              </div>

              {leadValidationError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{leadValidationError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingLead}
                  className="px-5 py-2 rounded-xl bg-[#0D5C46] hover:bg-[#0D5C46]/90 text-white text-xs font-black shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {updatingLead ? (
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
