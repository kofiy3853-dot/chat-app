import { createContext, useContext, useEffect, useState } from 'react';

export const AVAILABLE_THEMES = [
  { id: 'light', name: 'Light Mode', color: '#ffffff', textColor: '#2e8bc0' },
  { id: 'dark', name: 'Dark Mode', color: '#1a1a1a', textColor: '#ffffff' },
  { id: 'indigo-pulse', name: 'Indigo Pulse', color: '#4338ca', textColor: '#e0e7ff' },
  { id: 'cyan-glow', name: 'Cyan Glow', color: '#06b6d4', textColor: '#ffffff' },
  { id: 'deep-indigo', name: 'Deep Indigo', color: '#3730a3', textColor: '#ffffff' },
  { id: 'red', name: 'Crimson', color: '#dc2626', textColor: '#fca5a5' },
  { id: 'blue', name: 'Cobalt', color: '#2563eb', textColor: '#93c5fd' },
  { id: 'violet', name: 'Amethyst', color: '#7c3aed', textColor: '#c4b5fd' },
  { id: 'matrix', name: 'Matrix', color: '#00ff41', textColor: '#00ff41' }
];

const ThemeContext = createContext({ 
  theme: 'light', 
  setTheme: () => {},
  availableThemes: AVAILABLE_THEMES
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    // Read saved preference
    const saved = localStorage.getItem('theme_v2') || 'light';
    setThemeState(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const setTheme = (themeId) => {
    if (!AVAILABLE_THEMES.some(t => t.id === themeId)) return;
    setThemeState(themeId);
    localStorage.setItem('theme_v2', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
