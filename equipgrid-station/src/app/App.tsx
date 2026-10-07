import React, { useState } from 'react';
import { Layout } from './Layout';
import { DashboardView } from '../features/dashboard/DashboardView';
import { EquipmentCatalogView } from '../features/equipment/EquipmentCatalogView';
import { BookingDeskView } from '../features/booking/BookingDeskView';
import { DispatchYardView } from '../features/dispatch/DispatchYardView';
import { ReturnAuditView } from '../features/returninspection/ReturnAuditView';
import { PaymentLedgerView } from '../features/payment/PaymentLedgerView';
import { DealerNetworkView } from '../features/dealer/DealerNetworkView';
import { DailyCashReconciliationView } from '../features/reporting/DailyCashReconciliationView';
import { RentalConfigView } from '../features/rentalconfig/RentalConfigView';
import { LocationMasterView } from '../features/location/LocationMasterView';
import { UserManagementView } from '../features/users/UserManagementView';
import { Asset } from '../types';
import { useAuth } from '../lib/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { api } from '../services/api';

export const App: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const isGuest = currentUser?.role === 'guest';

  // Guests always open directly to the Fleet & Machinery tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    return isGuest ? 'catalog' : 'dashboard';
  });
  const [preselectedAsset, setPreselectedAsset] = useState<Asset | null>(null);
  const [guestBlockModal, setGuestBlockModal] = useState(false);
  const [triggerNewDeployment, setTriggerNewDeployment] = useState(false);
  const [, setApiVersion] = useState(0);

  React.useEffect(() => {
    api.init();
    return api.subscribe(() => {
      setApiVersion((v) => v + 1);
    });
  }, []);

  React.useEffect(() => {
    if (isGuest && activeTab !== 'catalog') {
      setActiveTab('catalog');
    }
  }, [isGuest, activeTab]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectForBooking = (asset: Asset) => {
    if (isGuest) {
      setGuestBlockModal(true);
      return;
    }
    setPreselectedAsset(asset);
    setActiveTab('booking');
  };

  const handleTabChange = (tab: string) => {
    // If guest, only allow catalog
    if (isGuest && tab !== 'catalog') {
      return;
    }
    setActiveTab(tab);
  };

  const handleNewDeployment = () => {
    if (isGuest) { setGuestBlockModal(true); return; }
    setActiveTab('booking');
    // Small delay so the BookingDeskView mounts before the effect fires
    setTimeout(() => setTriggerNewDeployment(true), 50);
  };

  return (
    <Layout activeTab={isGuest ? 'catalog' : activeTab} onTabChange={handleTabChange} onNewDeployment={handleNewDeployment}>
      {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
      {activeTab === 'catalog' && (
        <EquipmentCatalogView onSelectForBooking={handleSelectForBooking} />
      )}
      {(activeTab === 'booking' || activeTab === 'dispatch') && (
        <BookingDeskView
          preselectedAsset={preselectedAsset}
          onBookingCreated={() => setActiveTab('dashboard')}
          initialViewMode={activeTab === 'dispatch' ? 'dispatch' : 'all'}
          openCreateModal={triggerNewDeployment}
          onCreateModalOpened={() => setTriggerNewDeployment(false)}
        />
      )}
      {activeTab === 'rental-configs' && <RentalConfigView />}
      {activeTab === 'locations' && <LocationMasterView />}
      {activeTab === 'return' && <ReturnAuditView />}
      {activeTab === 'payments' && <PaymentLedgerView />}
      {activeTab === 'dealers' && <DealerNetworkView />}
      {activeTab === 'cash' && <DailyCashReconciliationView />}
      {activeTab === 'users' && <UserManagementView />}

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
