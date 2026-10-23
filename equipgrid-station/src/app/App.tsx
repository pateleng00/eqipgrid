import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Layout } from './Layout';
import { Asset } from '../types';
import { useAuth } from '../lib/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { CommandPalette } from '../components/CommandPalette';
import { api } from '../services/api';
import { getInitialActiveTab, persistActiveTab } from '../lib/navigationState';

// Route-level code splitting via dynamic imports
const DashboardView = lazy(() =>
  import('../features/dashboard/DashboardView').then((m) => ({ default: m.DashboardView })),
);
const EquipmentCatalogView = lazy(() =>
  import('../features/equipment/EquipmentCatalogView').then((m) => ({ default: m.EquipmentCatalogView })),
);
const MaintenanceDeckView = lazy(() =>
  import('../features/maintenance/MaintenanceDeckView').then((m) => ({ default: m.MaintenanceDeckView })),
);
const BookingDeskView = lazy(() =>
  import('../features/booking/BookingDeskView').then((m) => ({ default: m.BookingDeskView })),
);
const DispatchYardView = lazy(() =>
  import('../features/dispatch/DispatchYardView').then((m) => ({ default: m.DispatchYardView })),
);
const ReturnAuditView = lazy(() =>
  import('../features/returninspection/ReturnAuditView').then((m) => ({ default: m.ReturnAuditView })),
);
const PaymentLedgerView = lazy(() =>
  import('../features/payment/PaymentLedgerView').then((m) => ({ default: m.PaymentLedgerView })),
);
const DealerNetworkView = lazy(() =>
  import('../features/dealer/DealerNetworkView').then((m) => ({ default: m.DealerNetworkView })),
);
const DailyCashReconciliationView = lazy(() =>
  import('../features/reporting/DailyCashReconciliationView').then((m) => ({ default: m.DailyCashReconciliationView })),
);
const RentalConfigView = lazy(() =>
  import('../features/rentalconfig/RentalConfigView').then((m) => ({ default: m.RentalConfigView })),
);
const LocationMasterView = lazy(() =>
  import('../features/location/LocationMasterView').then((m) => ({ default: m.LocationMasterView })),
);
const UserManagementView = lazy(() =>
  import('../features/users/UserManagementView').then((m) => ({ default: m.UserManagementView })),
);
const CustomerSupportTicketsView = lazy(() =>
  import('../features/support/CustomerSupportTicketsView').then((m) => ({ default: m.CustomerSupportTicketsView })),
);
const DealerLeadsView = lazy(() =>
  import('../features/dealer/DealerLeadsView').then((m) => ({ default: m.DealerLeadsView })),
);
const ReportingAnalyticsView = lazy(() =>
  import('../features/reporting/ReportingAnalyticsView').then((m) => ({ default: m.ReportingAnalyticsView })),
);

const ViewLoadingFallback: React.FC = () => (
  <div className="space-y-4 animate-pulse p-4">
    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
    <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold">
      Loading view...
    </div>
  </div>
);

export const App: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const isGuest = currentUser?.role === 'guest';

  // Session-persistent active tab: preserves tab on browser refresh, defaults to 'dashboard' on fresh login
  const [activeTab, setActiveTab] = useState<string>(() => {
    return getInitialActiveTab(isGuest);
  });
  const [preselectedAsset, setPreselectedAsset] = useState<Asset | null>(null);
  const [guestBlockModal, setGuestBlockModal] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [triggerNewDeployment, setTriggerNewDeployment] = useState(false);
  const [, setApiVersion] = useState(0);

  React.useEffect(() => {
    api.init();
    return api.subscribe(() => {
      setApiVersion((v) => v + 1);
    });
  }, []);

  // Global Command+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to browser Back/Forward (popstate)
  React.useEffect(() => {
    const handlePopState = () => {
      const current = getInitialActiveTab(isGuest);
      setActiveTab(current);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isGuest]);

  React.useEffect(() => {
    if (isGuest && activeTab !== 'catalog') {
      handleTabChange('catalog');
    }
  }, [isGuest, activeTab]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleTabChange = (tab: string) => {
    // If guest, only allow catalog
    if (isGuest && tab !== 'catalog') {
      return;
    }
    setActiveTab(tab);
    persistActiveTab(tab);
  };

  const handleSelectForBooking = (asset: Asset) => {
    if (isGuest) {
      setGuestBlockModal(true);
      return;
    }
    setPreselectedAsset(asset);
    handleTabChange('booking');
  };

  const handleNewDeployment = () => {
    if (isGuest) {
      setGuestBlockModal(true);
      return;
    }
    handleTabChange('booking');
    // Small delay so the BookingDeskView mounts before the effect fires
    setTimeout(() => setTriggerNewDeployment(true), 50);
  };

  return (
    <Layout
      activeTab={isGuest ? 'catalog' : activeTab}
      onTabChange={handleTabChange}
      onNewDeployment={handleNewDeployment}
      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
    >
      <Suspense fallback={<ViewLoadingFallback />}>
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleTabChange} />}
        {activeTab === 'catalog' && <EquipmentCatalogView onSelectForBooking={handleSelectForBooking} />}
        {activeTab === 'maintenance' && <MaintenanceDeckView onNavigate={handleTabChange} />}
        {activeTab === 'booking' && (
          <BookingDeskView
            preselectedAsset={preselectedAsset}
            onBookingCreated={() => handleTabChange('dashboard')}
            initialViewMode="all"
            openCreateModal={triggerNewDeployment}
            onCreateModalOpened={() => setTriggerNewDeployment(false)}
          />
        )}
        {activeTab === 'support' && <CustomerSupportTicketsView onNavigateToBooking={handleTabChange} />}
        {activeTab === 'leads' && <DealerLeadsView onNavigateToDealers={() => handleTabChange('dealers')} />}
        {activeTab === 'dispatch' && <DispatchYardView onNavigateToPayment={() => handleTabChange('payments')} />}
        {activeTab === 'rental-configs' && <RentalConfigView />}
        {activeTab === 'locations' && <LocationMasterView />}
        {activeTab === 'return' && <ReturnAuditView />}
        {activeTab === 'payments' && <PaymentLedgerView />}
        {activeTab === 'dealers' && <DealerNetworkView />}
        {activeTab === 'cash' && <DailyCashReconciliationView />}
        {activeTab === 'reporting' && (
          <ReportingAnalyticsView
            onNavigateToCashRegister={() => handleTabChange('cash')}
            onNavigateToCatalog={() => handleTabChange('catalog')}
          />
        )}
        {activeTab === 'users' && <UserManagementView />}
      </Suspense>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleTabChange}
        onNewDeployment={handleNewDeployment}
        onSelectAsset={handleSelectForBooking}
      />

      {/* Guest booking restriction modal */}
      <ConfirmationModal
        isOpen={guestBlockModal}
        onClose={() => setGuestBlockModal(false)}
        variant="warning"
        title="Staff Login Required"
        message="Guest access is limited to browsing the machinery catalog. Please sign in with your station staff credentials to initiate a customer booking."
      />
    </Layout>
  );
};

export default App;
