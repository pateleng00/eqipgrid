import React, { ReactNode } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useTheme } from '../lib/ThemeContext';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { isDaylight } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDaylight ? 'bg-slate-100 text-slate-950' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-8xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className={`border-t px-6 py-3 text-xs text-center transition-colors duration-200 ${
          isDaylight
            ? 'border-slate-300 bg-transparent text-slate-600 font-medium'
            : 'border-slate-900 bg-slate-950/80 text-slate-500'
        }`}
      >
        <p>© 2026 EquipGrid Enterprise. All rights reserved.</p>
      </footer>
    </div>
  );
};
