import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { HamburgerMenu } from './HamburgerMenu';
import { api } from '../services/api';

interface HeaderProps {
  theme: 'light' | 'dark' | 'system';
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, setTheme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [version, setVersion] = useState<string>('1.2');

  useEffect(() => {
    api.getSystemVersion()
      .then((res) => {
        if (res && res.version) {
          setVersion(res.version);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch system version:', err);
      });
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition">
            🚴
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 dark:to-slate-100 bg-clip-text text-transparent tracking-tight">
            bicycle-log
          </span>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tracking-wide font-mono">
            v{version}
          </span>
        </a>

        <button
          onClick={() => setIsMenuOpen(true)}
          title="Menu"
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        theme={theme}
        setTheme={setTheme}
      />
    </header>
  );
};
