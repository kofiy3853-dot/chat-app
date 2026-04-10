import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes';

export const AVAILABLE_THEMES = [
  { id: 'light', name: 'Light Mode', color: '#ffffff', textColor: '#2e8bc0' },
  { id: 'dark', name: 'Dark Mode', color: '#1a1a1a', textColor: '#ffffff' },
  { id: 'system', name: 'System Default', color: 'transparent', textColor: '#64748b' },
  { id: 'indigo-pulse', name: 'Indigo Pulse', color: '#4338ca', textColor: '#e0e7ff' },
  { id: 'cyan-glow', name: 'Cyan Glow', color: '#06b6d4', textColor: '#ffffff' },
  { id: 'deep-indigo', name: 'Deep Indigo', color: '#3730a3', textColor: '#ffffff' },
  { id: 'red', name: 'Crimson', color: '#dc2626', textColor: '#fca5a5' },
  { id: 'blue', name: 'Cobalt', color: '#2563eb', textColor: '#93c5fd' },
  { id: 'violet', name: 'Amethyst', color: '#7c3aed', textColor: '#c4b5fd' },
  { id: 'matrix', name: 'Matrix', color: '#00ff41', textColor: '#00ff41' },
];

const ThemeContext = createContext({ 
  theme: 'light', 
  setTheme: () => {},
  availableThemes: AVAILABLE_THEMES
});

function ThemeSync({ children }) {
  const { theme, setTheme } = useNextTheme();
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }) {
  return (
    <NextThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={true}>
      <ThemeSync>
        {children}
      </ThemeSync>
    </NextThemeProvider>
  );
}

export const useTheme = () => useContext(ThemeContext);
