import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Truck,
  DollarSign,
  Calendar,
  Building2,
  Download,
  Filter,
  Wrench,
  Clock,
  Printer,
  X,
  Search,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  MapPin,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { formatINR, formatDate, cn } from '../../lib/utils';
import { api } from '../../services/api';
import { printReportDataPdf } from '../../services/voucherPdfService';
import { SearchSelect, SelectOption } from '../../components/SearchSelect';
import {
  ReportingKpiSummaryResponse,
  MachinesOnRentReportItem,
  CollectionsReportItem,
  MaintenanceReportItem,
  DealerRevenueReportItem,
  FutureBookingReportItem,
  State,
  City,
  Hub,
} from '../../types';

type ReportTabKey =
  | 'machines_on_rent'
  | 'collections'
  | 'maintenance'
  | 'dealer_revenue'
  | 'future_bookings';

type DateRangeOption =
  | 'today'
  | 'last_day'
  | 'last_7_days'
  | 'last_15_days'
  | 'current_month'
  | 'last_month';

const DATE_RANGE_LABELS: Record<DateRangeOption, { en: string; hi: string }> = {
  today: { en: 'Today', hi: 'आज' },
  last_day: { en: 'Last Day / Yesterday', hi: 'कल' },
  last_7_days: { en: 'Last 7 Days', hi: 'पिछले 7 दिन' },
  last_15_days: { en: 'Last 15 Days', hi: 'पिछले 15 दिन' },
  current_month: { en: 'Current Month', hi: 'चालू माह' },
  last_month: { en: 'Last Month', hi: 'पिछला माह' },
};

interface ReportingAnalyticsViewProps {
  onNavigateToCashRegister?: () => void;
  onNavigateToCatalog?: () => void;
}

export const ReportingAnalyticsView: React.FC<ReportingAnalyticsViewProps> = () => {
  const { isDaylight } = useTheme();

  // FILTER STATES (State, City, Hub, Date Range)
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<number | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>('today');

  // Active Report Tab & Modal state
  const [activeReportKey, setActiveReportKey] = useState<ReportTabKey>('machines_on_rent');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  // Loading & Data States
  const [loadingKpis, setLoadingKpis] = useState<boolean>(false);
  const [loadingReportData, setLoadingReportData] = useState<boolean>(false);

  // Live KPI Summary
  const [kpiSummary, setKpiSummary] = useState<ReportingKpiSummaryResponse>({
    machinesOnRentCount: 0,
    totalCollections: 0,
    machinesInMaintenanceCount: 0,
    dealersRevenue: 0,
    futureBookingsCount: 0,
    futureBookingsRevenue: 0,
    dateRange: 'today',
  });

  // Report Specific Records
  const [machinesOnRentData, setMachinesOnRentData] = useState<MachinesOnRentReportItem[]>([]);
  const [collectionsData, setCollectionsData] = useState<CollectionsReportItem[]>([]);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceReportItem[]>([]);
  const [dealerRevenueData, setDealerRevenueData] = useState<DealerRevenueReportItem[]>([]);
  const [futureBookingsData, setFutureBookingsData] = useState<FutureBookingReportItem[]>([]);

  // MASTER DATA LISTS (Cascading States, Cities, Hubs)
  const states: State[] = useMemo(() => api.getStates() || [], []);
  const availableCities: City[] = useMemo(() => {
    return api.getCities(selectedStateId ?? undefined) || [];
  }, [selectedStateId]);
  const availableHubs: Hub[] = useMemo(() => {
    return api.getHubs(selectedCityId ?? undefined) || [];
  }, [selectedCityId]);

  // REACT-SELECT (SearchSelect) OPTIONS
  const stateOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All States (सभी राज्य)' },
      ...states.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.code})`,
      })),
    ];
  }, [states]);

  const cityOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Cities (सभी शहर)' },
      ...availableCities.map((c) => ({
        value: c.id,
        label: c.name + (c.pinCode ? ` - ${c.pinCode}` : ''),
      })),
    ];
  }, [availableCities]);

  const hubOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Station Hubs (सभी हब)' },
      ...availableHubs.map((h) => ({
        value: h.id,
        label: `${h.name} (${h.code || `HUB-${h.id}`})`,
      })),
    ];
  }, [availableHubs]);

  const dateRangeOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'today', label: 'Today (आज)', badge: 'Default' },
      { value: 'last_day', label: 'Last Day / Yesterday (कल)' },
      { value: 'last_7_days', label: 'Last 7 Days (पिछले 7 दिन)' },
      { value: 'last_15_days', label: 'Last 15 Days (पिछले 15 दिन)' },
      { value: 'current_month', label: 'Current Month (चालू माह)' },
      { value: 'last_month', label: 'Last Month (पिछला माह)' },
    ];
  }, []);

  // FETCH SUMMARY KPIS
  const fetchKpiSummary = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const summary = await api.getReportingKpis({
        stateId: selectedStateId,
        cityId: selectedCityId,
        hubId: selectedHubId,
        dateRange: selectedDateRange,
      });
      setKpiSummary(summary);
    } catch (err) {
      console.error('Failed to load reporting KPI summary:', err);
    } finally {
      setLoadingKpis(false);
    }
  }, [selectedStateId, selectedCityId, selectedHubId, selectedDateRange]);

  // FETCH SPECIFIC REPORT DATA
  const fetchReportData = useCallback(
    async (reportKey: ReportTabKey) => {
      setLoadingReportData(true);
      try {
        const filters = {
          stateId: selectedStateId,
          cityId: selectedCityId,
          hubId: selectedHubId,
          dateRange: selectedDateRange,
        };

        switch (reportKey) {
          case 'machines_on_rent': {
            const data = await api.getMachinesOnRentReport(filters);
            setMachinesOnRentData(data || []);
            break;
          }
          case 'collections': {
            const data = await api.getCollectionsReport(filters);
            setCollectionsData(data || []);
            break;
          }
          case 'maintenance': {
            // Note: Per requirements, maintenance ONLY allows state, city, and hub filter (no date filter)
            const data = await api.getMachinesInMaintenanceReport({
              stateId: selectedStateId,
              cityId: selectedCityId,
              hubId: selectedHubId,
            });
            setMaintenanceData(data || []);
            break;
          }
          case 'dealer_revenue': {
            const data = await api.getDealerRevenueReport(filters);
            setDealerRevenueData(data || []);
            break;
          }
          case 'future_bookings': {
            const data = await api.getFutureBookingsReport(filters);
            setFutureBookingsData(data || []);
            break;
          }
        }
      } catch (err) {
        console.error(`Failed to load data for report [${reportKey}]:`, err);
      } finally {
        setLoadingReportData(false);
      }
    },
    [selectedStateId, selectedCityId, selectedHubId, selectedDateRange],
  );

  // Initial and reactive fetch for KPIs
  useEffect(() => {
    fetchKpiSummary();
  }, [fetchKpiSummary]);

  // Fetch report data when active tab or filters change
  useEffect(() => {
    fetchReportData(activeReportKey);
  }, [activeReportKey, fetchReportData]);

  // Helper when clicking a KPI card: Switch tab, load data, and open the modal!
  const handleKpiCardClick = (reportKey: ReportTabKey) => {
    setActiveReportKey(reportKey);
    fetchReportData(reportKey);
    setIsModalOpen(true);
    setModalSearchQuery('');
  };

  // EXPORT UTILITIES (CSV Download & Print-ready PDF)
  const getFilterText = () => {
    const stateObj = states.find((s) => s.id === selectedStateId);
    const cityObj = availableCities.find((c) => c.id === selectedCityId);
    const hubObj = availableHubs.find((h) => h.id === selectedHubId);
    return {
      state: stateObj ? stateObj.name : 'All States',
      city: cityObj ? cityObj.name : 'All Cities',
      hub: hubObj ? hubObj.name : 'All Hubs',
      dateRange:
        activeReportKey === 'maintenance'
          ? 'N/A (Active Live Maintenance Status Only)'
          : `${DATE_RANGE_LABELS[selectedDateRange].en} (${DATE_RANGE_LABELS[selectedDateRange].hi})`,
    };
  };

  const [downloadingXlsx, setDownloadingXlsx] = useState<boolean>(false);

  /**
   * Calls the specific backend download Excel API for the active report with selected filters.
   * No data building or spreadsheet formatting is performed on the client.
   */
  const handleExportXlsx = async () => {
    setDownloadingXlsx(true);
    try {
      const filters = {
        stateId: selectedStateId,
        cityId: selectedCityId,
        hubId: selectedHubId,
        dateRange: selectedDateRange,
      };

      switch (activeReportKey) {
        case 'machines_on_rent':
          await api.downloadMachinesOnRentExcel(filters);
          break;
        case 'collections':
          await api.downloadCollectionsExcel(filters);
          break;
        case 'maintenance':
          await api.downloadMaintenanceExcel({
            stateId: selectedStateId,
            cityId: selectedCityId,
            hubId: selectedHubId,
          });
          break;
        case 'dealer_revenue':
          await api.downloadDealerRevenueExcel(filters);
          break;
        case 'future_bookings':
          await api.downloadFutureBookingsExcel(filters);
          break;
        default:
          await api.downloadMachinesOnRentExcel(filters);
          break;
      }
    } catch (err) {
      console.error('Failed to export Excel report from server:', err);
      alert('Failed to download Excel report from server. Please ensure the backend is running and try again.');
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const handleExportPdf = () => {
    const filters = getFilterText();
    let reportTitle = '';
    let reportSubtitle = '';
    let reportNumber = `RPT-${Date.now().toString().slice(-6)}`;
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let summaryStats: Array<{ label: string; value: string }> = [];

    switch (activeReportKey) {
      case 'machines_on_rent':
        reportTitle = 'Machines on Rent Report (किराये पर सक्रिय मशीनें)';
        reportSubtitle = 'Live active deployment manifest & field assignment audit';
        headers = ['Tag & Machine', 'Booking Ref', 'Customer & Phone', 'Start Date', 'Exp Return', 'Daily Rate', 'Yard Hub'];
        rows = filteredMachinesOnRent.map((m) => [
          `${m.assetTag} - ${m.machineName}`,
          m.bookingNumber,
          `${m.customerName} (${m.customerPhone})`,
          formatDate(m.startDate),
          formatDate(m.expectedReturnDate),
          formatINR(m.dailyRate),
          `${m.hubName}, ${m.cityName}`,
        ]);
        summaryStats = [
          { label: 'Total Machines on Rent', value: `${filteredMachinesOnRent.length} Units` },
          { label: 'Date Scope', value: filters.dateRange },
        ];
        break;

      case 'collections':
        reportTitle = 'Collections & Revenue Ledger Report (संग्रहण रिपोर्ट)';
        reportSubtitle = 'Audited customer advance receipts and rental payments ledger';
        headers = ['Receipt #', 'Booking #', 'Customer', 'Payment Mode', 'Txn Ref', 'Amount (₹)', 'Date', 'Status'];
        const totalAmount = filteredCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
        rows = filteredCollections.map((c) => [
          c.receiptNumber,
          c.bookingNumber,
          `${c.customerName} (${c.customerPhone})`,
          c.paymentMode,
          c.transactionRef || 'N/A',
          formatINR(c.amount),
          formatDate(c.paymentDate),
          c.status,
        ]);
        summaryStats = [
          { label: 'Total Collected', value: formatINR(totalAmount) },
          { label: 'Total Receipts', value: `${filteredCollections.length}` },
          { label: 'Date Scope', value: filters.dateRange },
        ];
        break;

      case 'maintenance':
        reportTitle = 'Yard Maintenance & Service Report (मरम्मत व सर्विस रिपोर्ट)';
        reportSubtitle = 'Live yard breakdown & preventive inspection work orders (State/City/Hub Filtered)';
        headers = ['Ticket #', 'Tag & Machine', 'Yard Hub', 'Issue Details', 'Technician / Spares Workshop', 'Est Completion', 'Est Cost (₹)', 'Status'];
        const totalEstCost = filteredMaintenance.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
        rows = filteredMaintenance.map((m) => [
          m.ticketNumber,
          `${m.assetTag} - ${m.machineName}`,
          `${m.hubName}, ${m.cityName}`,
          m.issueDescription,
          m.technicianName,
          formatDate(m.estimatedCompletionDate),
          formatINR(m.estimatedCost),
          `${m.priority} / ${m.status}`,
        ]);
        summaryStats = [
          { label: 'Machines in Maintenance', value: `${filteredMaintenance.length} Units` },
          { label: 'Total Est. Repair Cost', value: formatINR(totalEstCost) },
          { label: 'Date Scope', value: 'Live Active Yard Status (No date filter)' },
        ];
        break;

      case 'dealer_revenue':
        reportTitle = 'Partner Dealers Revenue & Commission Report (डीलर राजस्व रिपोर्ट)';
        reportSubtitle = 'Partner network booking commission and machine rental turnover ledger';
        headers = ['Dealer Business', 'Contact', 'Hub Yard', 'Booking Ref', 'Machine', 'Gross Revenue (₹)', 'Comm %', 'Commission (₹)', 'Status'];
        const totalDealerRev = filteredDealerRevenue.reduce((sum, d) => sum + (d.grossRentalRevenue || 0), 0);
        const totalDealerComm = filteredDealerRevenue.reduce((sum, d) => sum + (d.commissionAmount || 0), 0);
        rows = filteredDealerRevenue.map((d) => [
          d.businessName,
          `${d.dealerName} (${d.phone})`,
          `${d.hubName}, ${d.cityName}`,
          d.bookingNumber,
          d.machineName,
          formatINR(d.grossRentalRevenue),
          `${(d.commissionRate * 100).toFixed(0)}%`,
          formatINR(d.commissionAmount),
          d.status,
        ]);
        summaryStats = [
          { label: 'Gross Rental Turnover', value: formatINR(totalDealerRev) },
          { label: 'Total Dealer Commissions', value: formatINR(totalDealerComm) },
          { label: 'Total Transactions', value: `${filteredDealerRevenue.length}` },
        ];
        break;

      case 'future_bookings':
        reportTitle = 'Future Dispatch & Upcoming Bookings Schedule (आगामी बुकिंग्स रिपोर्ट)';
        reportSubtitle = 'Scheduled customer bookings starting strictly tomorrow onwards (Next Day+)';
        headers = ['Booking Ref', 'Machine', 'Customer & Phone', 'Start Date', 'End Date', 'Days', 'Rate/Day', 'Total Value (₹)', 'Delivery Location'];
        const totalFutureVal = filteredFutureBookings.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
        rows = filteredFutureBookings.map((f) => [
          f.bookingNumber,
          `${f.machineName} (${f.assetTag})`,
          `${f.customerName} (${f.customerPhone})`,
          formatDate(f.startDate),
          formatDate(f.endDate),
          `${f.rentalDays} Days`,
          formatINR(f.dailyRate),
          formatINR(f.totalAmount),
          `${f.deliveryAddress}${f.landmark ? ` (Near: ${f.landmark})` : ''}`,
        ]);
        summaryStats = [
          { label: 'Future Bookings', value: `${filteredFutureBookings.length} Bookings` },
          { label: 'Total Scheduled Value', value: formatINR(totalFutureVal) },
          { label: 'Schedule Horizon', value: 'Strictly Tomorrow Onwards' },
        ];
        break;
    }

    printReportDataPdf({
      reportTitle,
      reportSubtitle,
      reportNumber,
      filters,
      headers,
      rows,
      summaryStats,
    });
  };

  // IN-MODAL SEARCH FILTERING
  const q = modalSearchQuery.trim().toLowerCase();

  const filteredMachinesOnRent = useMemo(() => {
    if (!q) return machinesOnRentData;
    return machinesOnRentData.filter(
      (m) =>
        m.machineName.toLowerCase().includes(q) ||
        m.assetTag.toLowerCase().includes(q) ||
        m.customerName.toLowerCase().includes(q) ||
        m.customerPhone.includes(q) ||
        m.bookingNumber.toLowerCase().includes(q) ||
        m.hubName.toLowerCase().includes(q),
    );
  }, [machinesOnRentData, q]);

  const filteredCollections = useMemo(() => {
    if (!q) return collectionsData;
    return collectionsData.filter(
      (c) =>
        c.receiptNumber.toLowerCase().includes(q) ||
        c.bookingNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.includes(q) ||
        c.paymentMode.toLowerCase().includes(q) ||
        c.transactionRef?.toLowerCase().includes(q) ||
        c.hubName.toLowerCase().includes(q),
    );
  }, [collectionsData, q]);

  const filteredMaintenance = useMemo(() => {
    if (!q) return maintenanceData;
    return maintenanceData.filter(
      (m) =>
        m.ticketNumber.toLowerCase().includes(q) ||
        m.assetTag.toLowerCase().includes(q) ||
        m.machineName.toLowerCase().includes(q) ||
        m.issueDescription.toLowerCase().includes(q) ||
        m.technicianName.toLowerCase().includes(q) ||
        m.hubName.toLowerCase().includes(q),
    );
  }, [maintenanceData, q]);

  const filteredDealerRevenue = useMemo(() => {
    if (!q) return dealerRevenueData;
    return dealerRevenueData.filter(
      (d) =>
        d.businessName.toLowerCase().includes(q) ||
        d.dealerName.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.bookingNumber.toLowerCase().includes(q) ||
        d.machineName.toLowerCase().includes(q) ||
        d.cityName.toLowerCase().includes(q) ||
        (d.stateName && d.stateName.toLowerCase().includes(q)) ||
        d.location.toLowerCase().includes(q),
    );
  }, [dealerRevenueData, q]);

  const filteredFutureBookings = useMemo(() => {
    if (!q) return futureBookingsData;
    return futureBookingsData.filter(
      (f) =>
        f.bookingNumber.toLowerCase().includes(q) ||
        f.customerName.toLowerCase().includes(q) ||
        f.customerPhone.includes(q) ||
        f.machineName.toLowerCase().includes(q) ||
        f.assetTag.toLowerCase().includes(q) ||
        f.deliveryAddress.toLowerCase().includes(q) ||
        f.hubName.toLowerCase().includes(q),
    );
  }, [futureBookingsData, q]);

  // Is maintenance tab active?
  const isMaintenanceActive = activeReportKey === 'maintenance';
  const isDealerRevenueActive = activeReportKey === 'dealer_revenue';

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto pr-1">
      {/* TOP HEADER BAR */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#E6F4EA] dark:bg-emerald-950/40 text-[#0D5C46] dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2
              className={cn(
                'text-lg sm:text-xl font-black tracking-tight flex items-center gap-2',
                isDaylight ? 'text-[#1E293B]' : 'text-white',
              )}
            >
              <span>Reports & Operational Analytics</span>
            </h2>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchKpiSummary();
              fetchReportData(activeReportKey);
            }}
            disabled={loadingKpis || loadingReportData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#1E293B] dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Refresh latest telemetry & station records"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 text-[#0D5C46]', (loadingKpis || loadingReportData) && 'animate-spin')}
            />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR (State, City, Hub, Date Range) - Using React-Select (SearchSelect) */}
      <div
        className={cn(
          'p-3 rounded-2xl border shadow-xs space-y-2',
          isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
        )}
      >
        <div className="flex items-center justify-between text-xs font-black text-[#1E293B] dark:text-slate-200">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#0D5C46]" />
            <span> Filters (फिल्टर)</span>
          </div>
          {(selectedStateId !== null ||
            selectedCityId !== null ||
            selectedHubId !== null ||
            selectedDateRange !== 'today') && (
            <button
              onClick={() => {
                setSelectedStateId(null);
                setSelectedCityId(null);
                setSelectedHubId(null);
                setSelectedDateRange('today');
              }}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. State Filter */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              State (राज्य)
            </label>
            <SearchSelect
              options={stateOptions}
              value={selectedStateId ?? 'ALL'}
              onChange={(val) => {
                const nextStateId = val === 'ALL' || !val ? null : Number(val);
                setSelectedStateId(nextStateId);
                setSelectedCityId(null);
                setSelectedHubId(null);
              }}
              placeholder="Select State..."
              isClearable={false}
            />
          </div>

          {/* 2. City Filter */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              City / District (जिला/शहर)
            </label>
            <SearchSelect
              options={cityOptions}
              value={selectedCityId ?? 'ALL'}
              onChange={(val) => {
                const nextCityId = val === 'ALL' || !val ? null : Number(val);
                setSelectedCityId(nextCityId);
                setSelectedHubId(null);
              }}
              placeholder="Select City..."
              isClearable={false}
            />
          </div>

          {/* 3. Hub Filter */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                Station Hub (हब केंद्र)
              </label>
              {isDealerRevenueActive && (
                <span className="text-[9px] font-extrabold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.2 rounded border border-purple-300">
                  N/A (Dealers Mapped to City)
                </span>
              )}
            </div>
            <SearchSelect
              options={hubOptions}
              value={isDealerRevenueActive ? 'ALL' : (selectedHubId ?? 'ALL')}
              onChange={(val) => {
                if (!isDealerRevenueActive) {
                  const nextHubId = val === 'ALL' || !val ? null : Number(val);
                  setSelectedHubId(nextHubId);
                }
              }}
              isDisabled={isDealerRevenueActive}
              placeholder={isDealerRevenueActive ? 'Dealers Mapped to City (No Hub)' : 'Select Hub Yard...'}
              isClearable={false}
            />
          </div>

          {/* 4. Date Range Filter (React-Select) - STRICT REQUIREMENT: Disabled for Maintenance */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                Date Horizon (समयावधि)
              </label>
              {isMaintenanceActive && (
                <span className="text-[9px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-300">
                  N/A for Maintenance
                </span>
              )}
            </div>
            <SearchSelect
              options={dateRangeOptions}
              value={isMaintenanceActive ? 'today' : selectedDateRange}
              onChange={(val) => {
                if (!isMaintenanceActive && val) {
                  setSelectedDateRange(val as DateRangeOption);
                }
              }}
              isDisabled={isMaintenanceActive}
              placeholder={isMaintenanceActive ? 'Date N/A (Live Yard Status)' : 'Select Date Range...'}
              isClearable={false}
            />
          </div>
        </div>
      </div>

      {/* KPI CARDS (3 in 1 row, count-only data, opens table modal on click) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 flex-shrink-0 pt-1">
        {/* Card 1: Total Machines on Rent */}
        <div
          onClick={() => handleKpiCardClick('machines_on_rent')}
          className={cn(
            'group rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-[#0D5C46] relative min-h-[180px]',
            isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Machines on Rent (सक्रिय किराये पर मशीनें)
              </span>
              <span className="text-xs text-[#94A3B8] font-medium">
                Scope: {DATE_RANGE_LABELS[selectedDateRange].en} ({DATE_RANGE_LABELS[selectedDateRange].hi})
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#E6F4EA] text-[#0D5C46] dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Truck className="h-6 w-6" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-[#0D5C46] dark:text-emerald-400">
              {kpiSummary.machinesOnRentCount} <span className="text-base font-sans font-bold text-[#64748B]">Units</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Active operational deployments on field
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#0D5C46] dark:text-emerald-400">
            <span>View Tabular Manifest & Export</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Total Collections */}
        <div
          onClick={() => handleKpiCardClick('collections')}
          className={cn(
            'group rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-emerald-600 relative min-h-[180px]',
            isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Total Collections (कुल संग्रहण व भुगतान)
              </span>
              <span className="text-xs text-[#94A3B8] font-medium">
                Scope: {DATE_RANGE_LABELS[selectedDateRange].en} ({DATE_RANGE_LABELS[selectedDateRange].hi})
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-[#1E293B] dark:text-white">
              {formatINR(kpiSummary.totalCollections)}
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Customer booking advances & rental receipts
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>View Receipt Ledger & Export</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Machines in Maintenance */}
        <div
          onClick={() => handleKpiCardClick('maintenance')}
          className={cn(
            'group rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-amber-600 relative min-h-[180px]',
            isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                In Maintenance (मरम्मत व सर्विस)
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                State / City / Hub Only (No Date)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Wrench className="h-6 w-6" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-amber-700 dark:text-amber-400">
              {kpiSummary.machinesInMaintenanceCount} <span className="text-base font-sans font-bold text-[#64748B]">Units</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Active yard breakdown & preventive work orders
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>View Service Tickets & Export</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Dealers Revenue */}
        <div
          onClick={() => handleKpiCardClick('dealer_revenue')}
          className={cn(
            'group rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-purple-600 relative min-h-[180px]',
            isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Dealers Revenue (डीलर नेटवर्क राजस्व)
              </span>
              <span className="text-xs text-[#94A3B8] font-medium">
                Scope: {DATE_RANGE_LABELS[selectedDateRange].en} ({DATE_RANGE_LABELS[selectedDateRange].hi})
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-[#1E293B] dark:text-white">
              {formatINR(kpiSummary.dealersRevenue)}
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Partner network commission & rental throughput
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400">
            <span>View Dealer Commissions & Export</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 5: Future Bookings (Count) */}
        <div
          onClick={() => handleKpiCardClick('future_bookings')}
          className={cn(
            'group rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-600 relative min-h-[180px]',
            isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Future Bookings (आगामी बुकिंग्स)
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-bold">
                Starting Tomorrow Onwards (कल से)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-blue-700 dark:text-blue-400">
              {kpiSummary.futureBookingsCount} <span className="text-base font-sans font-bold text-[#64748B]">Bookings</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Confirmed upcoming machinery reservations
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
            <span>View Dispatch Schedule & Export</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 6: Future Rental Value */}
        <div
          onClick={() => handleKpiCardClick('future_bookings')}
          className={cn(
            'group rounded-2xl border-2 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-teal-600 relative min-h-[180px]',
            isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Future Rental Value (आगामी राजस्व)
              </span>
              <span className="text-xs text-teal-700 dark:text-teal-400 font-bold">
                Scheduled Rental Horizon (Tomorrow+)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black font-mono text-teal-800 dark:text-teal-300">
              {formatINR(kpiSummary.futureBookingsRevenue)}
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Projected rental revenue from upcoming dispatches
            </p>
          </div>
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-400">
            <span>View Booking Details & Export</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
          <div
            className={cn(
              'w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden',
              isDaylight ? 'bg-white border-[#E2E8F0]' : 'bg-[#18181B] border-slate-700 text-white',
            )}
          >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] dark:bg-slate-900/80">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#1E293B] dark:text-white mt-1 flex items-center gap-2">
                  {activeReportKey === 'machines_on_rent' && 'Total Machines on Rent (किराये पर सक्रिय मशीनें)'}
                  {activeReportKey === 'collections' && 'Collections & Payments (संग्रहण व भुगतान )'}
                  {activeReportKey === 'maintenance' && 'Machines in Maintenance (मरम्मत व रखरखाव)'}
                  {activeReportKey === 'dealer_revenue' && 'Partner Dealers Turnover & Commissions (डीलर नेटवर्क राजस्व)'}
                  {activeReportKey === 'future_bookings' && 'Future Bookings Schedule (Starting Tomorrow Onwards)'}
                </h3>
              </div>

              {/* Modal Header Actions: Export CSV, Print PDF, and Close */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportXlsx}
                  disabled={downloadingXlsx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                  title="Download server-generated Microsoft Excel spreadsheet (.xlsx)"
                >
                  <FileSpreadsheet className={cn('h-3.5 w-3.5', downloadingXlsx && 'animate-spin')} />
                  <span>{downloadingXlsx ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#0D5C46] bg-[#0D5C46] text-white hover:bg-[#0A4B38] text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Download / Print PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#64748B] dark:text-slate-300 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* In-Modal Quick Filter Bar */}
            <div className="p-3 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Quick search by customer, machine, tag, booking #, phone..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D5C46]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-[#64748B] dark:text-slate-400">
                {activeReportKey === 'machines_on_rent' && (
                  <span>Showing {filteredMachinesOnRent.length} of {machinesOnRentData.length} active units</span>
                )}
                {activeReportKey === 'collections' && (
                  <span>Showing {filteredCollections.length} of {collectionsData.length} payment receipts</span>
                )}
                {activeReportKey === 'maintenance' && (
                  <span>Showing {filteredMaintenance.length} of {maintenanceData.length} repair tickets</span>
                )}
                {activeReportKey === 'dealer_revenue' && (
                  <span>Showing {filteredDealerRevenue.length} of {dealerRevenueData.length} dealer commissions</span>
                )}
                {activeReportKey === 'future_bookings' && (
                  <span>Showing {filteredFutureBookings.length} of {futureBookingsData.length} future bookings</span>
                )}
              </div>
            </div>

            {/* Modal Body - Scrollable Table */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[62vh]">
              <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC] dark:bg-slate-900 text-[#475569] dark:text-slate-400 uppercase font-black tracking-wider text-[10px] sticky top-0 z-10 border-b border-[#E2E8F0] dark:border-slate-800">
                    {activeReportKey === 'machines_on_rent' && (
                      <tr>
                        <th className="px-4 py-3">Asset Tag & Machine</th>
                        <th className="px-4 py-3">Booking Ref</th>
                        <th className="px-4 py-3">Customer Name & Contact</th>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3">Expected Return</th>
                        <th className="px-4 py-3">Daily Rate</th>
                        <th className="px-4 py-3">Hub & Delivery Address</th>
                        <th className="px-4 py-3 text-right">Operational Status</th>
                      </tr>
                    )}
                    {activeReportKey === 'collections' && (
                      <tr>
                        <th className="px-4 py-3">Receipt Number</th>
                        <th className="px-4 py-3">Booking Reference</th>
                        <th className="px-4 py-3">Customer & Contact</th>
                        <th className="px-4 py-3">Station Yard</th>
                        <th className="px-4 py-3">Payment Mode</th>
                        <th className="px-4 py-3">Txn Reference</th>
                        <th className="px-4 py-3">Receipt Date</th>
                        <th className="px-4 py-3 text-right">Amount (₹)</th>
                      </tr>
                    )}
                    {activeReportKey === 'maintenance' && (
                      <tr>
                        <th className="px-4 py-3">Ticket Number</th>
                        <th className="px-4 py-3">Asset Tag & Model</th>
                        <th className="px-4 py-3">Station Hub</th>
                        <th className="px-4 py-3">Issue Diagnosis</th>
                        <th className="px-4 py-3">Assigned Workshop / Tech</th>
                        <th className="px-4 py-3">Entered Date</th>
                        <th className="px-4 py-3">Est. Completion</th>
                        <th className="px-4 py-3 text-right">Est. Cost</th>
                      </tr>
                    )}
                    {activeReportKey === 'dealer_revenue' && (
                      <tr>
                        <th className="px-4 py-3">Dealer Business Name</th>
                        <th className="px-4 py-3">Partner Contact</th>
                        <th className="px-4 py-3">City & State Territory</th>
                        <th className="px-4 py-3">Booking Ref</th>
                        <th className="px-4 py-3">Machine Assigned</th>
                        <th className="px-4 py-3">Gross Rental Value</th>
                        <th className="px-4 py-3">Comm Rate</th>
                        <th className="px-4 py-3 text-right">Dealer Commission (₹)</th>
                      </tr>
                    )}
                    {activeReportKey === 'future_bookings' && (
                      <tr>
                        <th className="px-4 py-3">Booking Number</th>
                        <th className="px-4 py-3">Machine & Tag</th>
                        <th className="px-4 py-3">Customer Details</th>
                        <th className="px-4 py-3">Start Date (Tomorrow+)</th>
                        <th className="px-4 py-3">End Date</th>
                        <th className="px-4 py-3">Days</th>
                        <th className="px-4 py-3">Daily Rate</th>
                        <th className="px-4 py-3">Total Value</th>
                        <th className="px-4 py-3">Delivery Address & Landmark</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                    {/* MODAL 1: MACHINES ON RENT */}
                    {activeReportKey === 'machines_on_rent' &&
                      (filteredMachinesOnRent.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                            No machines matching your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredMachinesOnRent.map((m) => (
                          <tr key={m.assetId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-bold text-[#1E293B] dark:text-white">
                              <div>{m.machineName}</div>
                              <div className="text-[10px] font-mono text-[#0D5C46] dark:text-emerald-400">
                                {m.assetTag}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-[#475569] dark:text-slate-300">
                              {m.bookingNumber}
                            </td>
                            <td className="px-4 py-3 text-[#1E293B] dark:text-slate-200">
                              <div className="font-bold">{m.customerName}</div>
                              <div className="text-[10px] text-[#64748B]">{m.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{formatDate(m.startDate)}</td>
                            <td className="px-4 py-3 font-mono text-xs text-amber-700 dark:text-amber-400">
                              {formatDate(m.expectedReturnDate)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-[#0D5C46] dark:text-emerald-400">
                              {formatINR(m.dailyRate)}/day
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[#64748B]">
                              <div className="font-semibold text-[#1E293B] dark:text-slate-200">{m.deliveryAddress}</div>
                              <div className="text-[10px]">{m.hubName}, {m.cityName}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                                ON RENT
                              </span>
                            </td>
                          </tr>
                        ))
                      ))}

                    {/* MODAL 2: COLLECTIONS */}
                    {activeReportKey === 'collections' &&
                      (filteredCollections.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                            No collection records matching your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredCollections.map((c) => (
                          <tr key={c.paymentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-bold text-[#1E293B] dark:text-white">
                              {c.receiptNumber}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{c.bookingNumber}</td>
                            <td className="px-4 py-3 text-[#1E293B] dark:text-slate-200">
                              <div className="font-bold">{c.customerName}</div>
                              <div className="text-[10px] text-[#64748B]">{c.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#64748B]">
                              {c.hubName}, {c.cityName}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300">
                                {c.paymentMode}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#64748B]">
                              {c.transactionRef || 'N/A'}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{formatDate(c.paymentDate)}</td>
                            <td className="px-4 py-3 font-mono font-bold text-right text-emerald-700 dark:text-emerald-400">
                              {formatINR(c.amount)}
                            </td>
                          </tr>
                        ))
                      ))}

                    {/* MODAL 3: MAINTENANCE */}
                    {activeReportKey === 'maintenance' &&
                      (filteredMaintenance.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                            No active maintenance tickets matching your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredMaintenance.map((m) => (
                          <tr key={m.ticketNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {m.ticketNumber}
                            </td>
                            <td className="px-4 py-3 font-bold text-[#1E293B] dark:text-white">
                              <div>{m.machineName}</div>
                              <div className="text-[10px] font-mono text-[#64748B]">{m.assetTag}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#64748B]">
                              {m.hubName}, {m.cityName}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#1E293B] dark:text-slate-200 max-w-sm">
                              {m.issueDescription}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#64748B]">{m.technicianName}</td>
                            <td className="px-4 py-3 font-mono text-xs">{formatDate(m.enteredMaintenanceAt)}</td>
                            <td className="px-4 py-3 font-mono text-xs text-amber-700">
                              {formatDate(m.estimatedCompletionDate)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-right text-rose-700 dark:text-rose-400">
                              {formatINR(m.estimatedCost)}
                            </td>
                          </tr>
                        ))
                      ))}

                    {/* MODAL 4: DEALER REVENUE */}
                    {activeReportKey === 'dealer_revenue' &&
                      (filteredDealerRevenue.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                            No dealer partner records matching your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredDealerRevenue.map((d) => (
                          <tr key={d.bookingNumber || d.dealerId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-bold text-[#1E293B] dark:text-white">
                              <div>{d.businessName}</div>
                              <div className="text-[10px] text-[#64748B]">{d.location}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#1E293B] dark:text-slate-200">
                              <div className="font-bold">{d.dealerName}</div>
                              <div className="text-[10px] text-[#64748B]">{d.phone}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#64748B]">
                              <div className="font-semibold text-[#1E293B] dark:text-slate-200">{d.cityName || 'City Territory'}</div>
                              <div className="text-[10px]">{d.stateName || ''}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{d.bookingNumber}</td>
                            <td className="px-4 py-3 text-xs text-[#1E293B] dark:text-slate-200">{d.machineName}</td>
                            <td className="px-4 py-3 font-mono font-bold text-[#1E293B] dark:text-white">
                              {formatINR(d.grossRentalRevenue)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-[#0D5C46]">
                              {(d.commissionRate * 100).toFixed(0)}%
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-right text-purple-700 dark:text-purple-400">
                              {formatINR(d.commissionAmount)}
                            </td>
                          </tr>
                        ))
                      ))}

                    {/* MODAL 5: FUTURE BOOKINGS */}
                    {activeReportKey === 'future_bookings' &&
                      (filteredFutureBookings.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                            No upcoming bookings starting tomorrow matching your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredFutureBookings.map((f) => (
                          <tr key={f.bookingNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-bold text-[#1E293B] dark:text-white">
                              {f.bookingNumber}
                            </td>
                            <td className="px-4 py-3 font-bold text-[#1E293B] dark:text-white">
                              <div>{f.machineName}</div>
                              <div className="text-[10px] font-mono text-[#0D5C46] dark:text-emerald-400">
                                {f.assetTag}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#1E293B] dark:text-slate-200">
                              <div className="font-bold">{f.customerName}</div>
                              <div className="text-[10px] text-[#64748B]">{f.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                              {formatDate(f.startDate)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{formatDate(f.endDate)}</td>
                            <td className="px-4 py-3 font-mono font-bold">{f.rentalDays} Days</td>
                            <td className="px-4 py-3 font-mono text-xs">{formatINR(f.dailyRate)}/day</td>
                            <td className="px-4 py-3 font-mono font-bold text-[#0D5C46] dark:text-emerald-400">
                              {formatINR(f.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[#64748B]">
                              <div className="font-semibold text-[#1E293B] dark:text-slate-200">
                                {f.deliveryAddress}
                              </div>
                              {f.landmark && (
                                <div className="text-[10px] text-slate-500">Landmark: {f.landmark}</div>
                              )}
                              <div className="text-[10px] text-[#0D5C46] font-bold">
                                {f.hubName}, {f.cityName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                {f.bookingStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-3 sm:p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/80 flex items-center justify-between">
              <div className="text-xs text-[#64748B] dark:text-slate-400">
                <span>Press ESC or click close to dismiss this modal report.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#1E293B] dark:text-slate-200 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
