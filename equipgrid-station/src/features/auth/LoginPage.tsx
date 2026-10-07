import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  ExternalLink,
  Headphones,
  Truck,
} from 'lucide-react';
import { useAuth, PRESET_USERS } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const LoginPage: React.FC = () => {
  const { loginAsRole, loginWithCredentials } = useAuth();
  const { isDaylight, toggleTheme } = useTheme();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const showInfo = (title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setInfoModal({ isOpen: true, title, message, variant });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubmitting(true);
    try {
      const success = await loginWithCredentials(emailInput, passwordInput);
      if (!success) {
        showInfo('Authentication Failed', 'Invalid email, username, or password. Please verify your credentials.', 'error');
      }
    } catch (err: any) {
      showInfo('Authentication Error', err.message || 'Unable to complete sign-in.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    loginAsRole('guest');
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col lg:flex-row transition-colors duration-200 ${
        isDaylight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* =========================================================================
          LEFT HALF: HERO & PRESENTATION (Dynamic Light & Dark Theme Support)
          ========================================================================= */}
      <div
        className={`relative w-full lg:w-[52%] xl:w-[54%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r transition-colors duration-200 ${
          isDaylight
            ? 'bg-slate-100/90 text-slate-950 border-slate-300'
            : 'bg-[#1e1e1e] text-white border-slate-800'
        }`}
      >
        {/* Decorative Grid Lines and Diagonal Ambient Lighting */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity ${
            isDaylight ? 'opacity-30' : 'opacity-20'
          }`}
          style={{
            backgroundImage: isDaylight
              ? `linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Diagonal Perspective Accent Light Rays */}
        <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDaylight ? 'bg-blue-500/10' : 'bg-blue-600/10'
        }`} />
        <div className={`absolute top-1/3 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isDaylight ? 'bg-amber-400/10' : 'bg-amber-500/10'
        }`} />
        <div className={`absolute bottom-10 left-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
          isDaylight ? 'bg-emerald-400/10' : 'bg-emerald-500/10'
        }`} />

        {/* Diagonal Accent Lines */}
        <div className={`absolute inset-0 pointer-events-none overflow-hidden ${
          isDaylight ? 'opacity-20' : 'opacity-30'
        }`}>
          <div className="absolute -top-10 left-1/3 w-[2px] h-[140%] bg-gradient-to-b from-transparent via-blue-400/40 to-transparent rotate-[35deg]" />
          <div className="absolute top-20 left-1/4 w-[1px] h-[120%] bg-gradient-to-b from-transparent via-amber-400/30 to-transparent rotate-[35deg]" />
        </div>

        {/* Top Header: Brand Logo + Portal Name + External URL Link */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Rectangular Logo */}
            <img
              src="/logo-rectangle.png"
              alt="EquipGrid"
              className="h-20 sm:h-24 md:h-28 w-auto max-w-[480px] object-contain drop-shadow-lg"
            />
            <div className={`hidden xl:block border-l pl-3 ${
              isDaylight ? 'border-slate-300' : 'border-slate-700/80'
            }`}>
              <span className={`text-xs font-semibold tracking-wide block ${
                isDaylight ? 'text-slate-800' : 'text-slate-300'
              }`}>
                Construction & Agri Equipment OS
              </span>
              <span className="text-slate-500 text-[10px] font-mono tracking-wider uppercase">
                Enterprise Portal
              </span>
            </div>
          </div>

          <a
            href="https://equipgrid.in"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 text-xs transition-colors font-mono ${
              isDaylight ? 'text-slate-700 hover:text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>equipgrid.in</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Middle Hero Content: Tag, Punchy Typography, Narrative Description */}
        <div className="relative z-10 my-12 lg:my-auto max-w-xl space-y-6">
          {/* Tag Pill */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${
            isDaylight
              ? 'border-blue-400/70 bg-blue-100 text-blue-900 font-bold'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isDaylight ? 'bg-blue-600' : 'bg-blue-400'} animate-pulse`} />
            <span>Rural Agro & Civil Equipment Grid</span>
          </div>

          {/* Bold Heading */}
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] ${
            isDaylight ? 'text-slate-950' : 'text-white'
          }`}>
            Powering Work. <br />
            Growing Progress.
          </h1>

          {/* Narrative Paragraph */}
          <p className={`text-sm sm:text-base leading-relaxed max-w-2xl ${
            isDaylight ? 'text-slate-700 font-medium' : 'text-slate-400'
          }`}>
            A complete operating platform for the equipment ecosystem, built to manage the journey from equipment availability and customer booking to dispatch, rental, return, inspection, maintenance, payments and operational analytics — creating a connected and efficient equipment network for construction and agriculture.
          </p>
        </div>

        {/* Bottom Hero Stats: 3 Metric Columns */}
        <div className={`relative z-10 grid grid-cols-3 gap-6 pt-6 border-t ${
          isDaylight ? 'border-slate-300' : 'border-slate-800/80'
        }`}>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDaylight ? 'text-slate-950' : 'text-white'
            }`}>
              11+
            </div>
            <div className={`text-[11px] sm:text-xs mt-1 font-medium ${
              isDaylight ? 'text-slate-700 font-bold' : 'text-slate-400'
            }`}>
              Machines Ready
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDaylight ? 'text-slate-950' : 'text-white'
            }`}>
              ₹0
            </div>
            <div className={`text-[11px] sm:text-xs mt-1 font-medium ${
              isDaylight ? 'text-slate-700 font-bold' : 'text-slate-400'
            }`}>
              Credit Barrier
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDaylight ? 'text-slate-950' : 'text-white'
            }`}>
              5 KM
            </div>
            <div className={`text-[11px] sm:text-xs mt-1 font-medium ${
              isDaylight ? 'text-slate-700 font-bold' : 'text-slate-400'
            }`}>
              Free Delivery
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT HALF: CLEAN SIGN-IN FORM SIDE (Stride Style)
          ========================================================================= */}
      <div
        className={`w-full lg:w-[48%] xl:w-[46%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 transition-colors duration-200 ${
          isDaylight ? 'bg-slate-50 text-slate-950' : 'bg-slate-900/60 text-slate-100'
        }`}
      >
        {/* Top bar on right: Daylight Mode toggle */}
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            aria-label="Toggle Daylight Mode"
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer shadow-none ${
              isDaylight
                ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isDaylight ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-600 animate-[spin_12s_linear_infinite]" />
                <span className="font-bold text-slate-900">Daylight</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-slate-400" />
                <span>Daylight Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Centered Sign-In Content */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="space-y-6">
            {/* Header Titles */}
            <div>
              <div className="mb-4 lg:hidden">
                <img
                  src="/logo-rectangle.png"
                  alt="EquipGrid"
                  className="h-16 w-auto max-w-[320px] object-contain"
                />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">Sign in</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Enter your registered staff credentials to access your station console.
              </p>
            </div>

            {/* Sign-in Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
              {/* Email Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Staff Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. admin@equipgrid.in, manager.hardoi@equipgrid.in"
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-3 text-xs transition-colors focus:outline-none ${
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-400 focus:border-slate-950'
                        : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-slate-600'
                    }`}
                    required
                  />
                </div>

                {/* Quick Role Fillers */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                    Quick Preset Access:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput('admin@equipgrid.in');
                        setPasswordInput('admin123');
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                    >
                      👑 Root (Super Admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput('admin.ops@equipgrid.in');
                        setPasswordInput('admin123');
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
                    >
                      🛡️ Admin (Operations)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput('manager.hardoi@equipgrid.in');
                        setPasswordInput('admin123');
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      🏢 Manager (Hardoi Yard)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput('booking.desk@equipgrid.in');
                        setPasswordInput('admin123');
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
                    >
                      ⌨️ Operator (Desk)
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      showInfo(
                        'Password Reset',
                        'A PIN reset link has been dispatched via WhatsApp to your registered mobile number. Contact your Station Manager if you need immediate access.',
                        'info'
                      )
                    }
                    className={`text-[11px] transition-colors cursor-pointer ${
                      isDaylight ? 'text-slate-600 hover:text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••"
                    className={`w-full rounded-xl border pl-10 pr-10 py-3 text-xs transition-colors focus:outline-none ${
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-400 focus:border-slate-950'
                        : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-slate-600'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer ${
                      isDaylight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${
                  isDaylight
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20 active:scale-[0.99]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                }`}
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Continue to station console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className={`w-full border-t ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`} />
              <span className={`absolute px-3 text-[10px] font-bold uppercase tracking-wider ${
                isDaylight ? 'bg-slate-50 text-slate-500' : 'bg-slate-900 text-slate-500'
              }`}>
                Customer Access
              </span>
            </div>

            {/* Dedicated Guest Mode Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGuestAccess}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 border shadow-sm ${
                  isDaylight
                    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900'
                    : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <Truck className="h-4 w-4 text-amber-500" />
                <span>Browse Machinery Catalog (Guest Mode)</span>
              </button>
              <p className="text-[11px] text-center text-slate-500 leading-normal">
                No password required. Open directly to view all machinery, technical specifications & rental models.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Floating Assistance Card (Matching Stride Reference Box) */}
        <div className="w-full max-w-md mx-auto space-y-4 pt-6">
          <div
            className={`p-4 rounded-2xl border text-xs transition-colors flex items-start gap-3 shadow-sm ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-800'
                : 'border-slate-800 bg-slate-900/80 text-slate-300'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isDaylight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Headphones className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-slate-500 leading-snug">
                Need assistance? Our Station Dispatch & WhatsApp Support team will get back to you shortly.
              </p>
              <p className="text-[11px] font-medium">
                Write to Us:{' '}
                <a
                  href="mailto:support@equipgrid.in"
                  className={`font-bold hover:underline ${
                    isDaylight ? 'text-blue-700' : 'text-blue-400'
                  }`}
                >
                  support@equipgrid.in
                </a>
              </p>
            </div>
          </div>

          {/* Privacy & Legal Links */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <button
              onClick={() => showInfo(
                'Data Privacy & Security',
                'EquipGrid Station Data Security: 256-bit AES encrypted with zero-credit escrow validation. All data is processed locally and never shared with third parties.',
                'info'
              )}
              className={`transition-colors cursor-pointer ${
                isDaylight ? 'hover:text-slate-900 text-slate-600' : 'hover:text-slate-200 text-slate-400'
              }`}
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => showInfo(
                'Legal Disclosures',
                'Operating under Uttar Pradesh Rural Equipment Dispatch Regulations 2026. All rental contracts are governed by applicable UP state equipment leasing norms.',
                'info'
              )}
              className={`transition-colors cursor-pointer ${
                isDaylight ? 'hover:text-slate-900 text-slate-600' : 'hover:text-slate-200 text-slate-400'
              }`}
            >
              Legal Disclosures
            </button>
          </div>
        </div>
      </div>

      {/* Info / Feedback Modal */}
      <ConfirmationModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal((p) => ({ ...p, isOpen: false }))}
        variant={infoModal.variant}
        title={infoModal.title}
        message={infoModal.message}
      />
    </div>
  );
};
