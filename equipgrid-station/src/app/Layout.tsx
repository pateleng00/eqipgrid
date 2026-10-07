import React, { ReactNode } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useTheme } from '../lib/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewDeployment?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onNewDeployment }) => {
  const { isDaylight } = useTheme();

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden transition-colors duration-200 ${
        isDaylight ? 'bg-slate-100 text-slate-950' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} onTabChange={onTabChange} onNewDeployment={onNewDeployment} />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

        {/* Content Viewport */}
        <main className="flex-1 overflow-hidden px-3 py-2 sm:px-5 sm:py-2 flex flex-col min-h-0">
          <div className="w-full max-w-8xl mx-auto flex-1 flex flex-col min-h-0">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className={`flex-shrink-0 border-t px-4 py-1.5 text-[11px] text-center transition-colors duration-200 ${
          isDaylight
            ? 'border-slate-200 bg-white text-slate-700 font-semibold'
            : 'border-slate-900 bg-slate-950/80 text-slate-500'
        }`}
      >
        <p>© 2026 EquipGrid Enterprise. All rights reserved.</p>
      </footer>
    </div>
  );
};

