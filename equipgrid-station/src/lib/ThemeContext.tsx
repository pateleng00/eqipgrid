import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'daylight';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDaylight: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  isDaylight: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('equipgrid-theme') as Theme;
    return saved === 'daylight' ? 'daylight' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'daylight') {
      root.classList.add('daylight');
      root.classList.remove('dark');
    } else {
      root.classList.remove('daylight');
      root.classList.add('dark');
    }
    localStorage.setItem('equipgrid-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'daylight' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDaylight: theme === 'daylight' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
