import { createContext, useContext, useEffect, useState } from 'react';

export const AVAILABLE_THEMES = [
  { id: 'light', name: 'Light Mode', color: '#ffffff', textColor: '#2e8bc0' },
  { id: 'dark', name: 'Dark Mode', color: '#1a1a1a', textColor: '#ffffff' },
  { id: 'midnight', name: 'Midnight', color: '#0f172a', textColor: '#38bdf8' },
  { id: 'cream', name: 'Cream', color: '#fcfaf6', textColor: '#7b7167' },
  { id: 'forest', name: 'Forest', color: '#0a0f0d', textColor: '#10b981' },
  { id: 'ocean', name: 'Deep Ocean', color: '#112534', textColor: '#0ea5e9' },
  { id: 'sunset', name: 'Sunset', color: '#1a130f', textColor: '#f59e0b' },
  { id: 'royal', name: 'Royal', color: '#2e8bc0', textColor: '#ffffff' },
  { id: 'ghost', name: 'Ghost', color: '#f1f5f9', textColor: '#64748b' },
  { id: 'matrix', name: 'Matrix', color: '#050505', textColor: '#00ff41' }
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
