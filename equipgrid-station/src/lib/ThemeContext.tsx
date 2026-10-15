import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'daylight';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDaylight: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'daylight',
  toggleTheme: () => {},
  isDaylight: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<Theme>('daylight');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('daylight');
    root.classList.remove('dark');
    localStorage.setItem('equipgrid-theme', 'daylight');
  }, []);

  const toggleTheme = () => {
    // Light mode is the default and only theme for station operations
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDaylight: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
