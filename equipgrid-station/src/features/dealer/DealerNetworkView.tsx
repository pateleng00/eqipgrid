import React, { useState } from 'react';
import {
  Users,
  Percent,
  Plus,
  MapPin,
  Phone,
  CheckCircle,
  Building,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { formatINR } from '../../lib/utils';
import { SearchSelect } from '../../components/SearchSelect';
import { api } from '../../services/api';
import { Dealer } from '../../types';

export const DealerNetworkView: React.FC = () => {
  const { isDaylight } = useTheme();
  const [dealers, setDealers] = useState<Dealer[]>(api.dealers);
  const [showAddModal, setShowAddModal] = useState(false);

  React.useEffect(() => {
    setDealers(api.dealers);
    return api.subscribe(() => {
      setDealers(api.dealers);
    });
  }, []);

  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Hardoi Central');

  const totalCommissions = dealers.reduce((acc, d) => acc + d.totalCommissionEarned, 0);

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addDealer({
        name,
        tradeName,
        phone,
        location,
        commissionRate: 0.06,
        active: true,
      });
      setShowAddModal(false);
      setName('');
      setTradeName('');
      setPhone('');
    } catch (err) {
      console.error('Failed to create dealer:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-400" />
            Channel Partners & Dealer Network (6% Model)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Strategic partnerships across key cement yards, brick kilns & agri equipment stores
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-none ${
            isDaylight
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Onboard Channel Partner</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Partners</span>
          <div className="text-2xl font-extrabold text-white mt-1">{dealers.length} Yards / Stores</div>
          <p className="text-xs text-slate-500 mt-0.5">Covering Hardoi, Sandila & Bilgram</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Commission Rule</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">6.0% Flat</div>
          <p className="text-xs text-slate-500 mt-0.5">Calculated on Gross Equipment Rent</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Commissions Tracked</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{formatINR(totalCommissions)}</div>
          <p className="text-xs text-slate-500 mt-0.5">Payable upon completed rental</p>
        </div>
      </div>

      {/* Partner Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {dealers.map((dealer) => (
          <div
            key={dealer.id}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3 hover:border-amber-500/30 transition-all shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{dealer.tradeName}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className={`h-3 w-3 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
                  {dealer.location}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-mono border ${
                isDaylight
                  ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
              }`}>
                6% Partner
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Contact Person:</span>
                <span className="font-medium text-slate-200">{dealer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-200">{dealer.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bookings Referred:</span>
                <span className="font-bold text-white">{dealer.totalReferrals}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-semibold">Earned Commission:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatINR(dealer.totalCommissionEarned)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Onboard Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-amber-500/25 bg-[#242424] p-7 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Onboard New Dealer / Referral Partner</h3>
                <p className="mt-0.5 text-xs text-slate-400">Add a trusted local referral partner to your network.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close dealer onboarding dialog"
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddDealer} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business / Shop Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bilgram Kisan Fertilizers & Seeds"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Proprietor / Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Arvind Mishra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="+919450009988"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Territory Hub (Search & Select)</label>
                  <SearchSelect
                    options={[
                      { value: 'Hardoi Central', label: 'Hardoi Central', subLabel: 'HQ & Main Hub' },
                      { value: 'Sandila Industrial Area', label: 'Sandila Industrial', subLabel: 'Industrial Zone' },
                      { value: 'Bilgram Town', label: 'Bilgram Town', subLabel: 'Agri Belt' },
                      { value: 'Rural Periphery', label: 'Rural Periphery', subLabel: 'Extended Range' },
                    ]}
                    value={location}
                    onChange={(val) => val && setLocation(String(val))}
                    placeholder="Select territory..."
                    isClearable={false}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors ${
                    isDaylight
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  Onboard Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
