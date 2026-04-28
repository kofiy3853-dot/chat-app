import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export const THEMES = {
  DARK:  'dark',
  WHITE: 'white',
  BLUE:  'blue',
}

const themeMetaColors = {
  dark:  '#000000',
  white: '#FFFFFF',
  blue:  '#001F3F',
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(THEMES.DARK)
  const [mounted, setMounted] = useState(false)

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-theme') || THEMES.DARK
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    setMounted(true)
  }, [])

  const switchTheme = (newTheme) => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('app-theme', newTheme)

    // Update PWA theme-color meta tag for OS status bar
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', themeMetaColors[newTheme])
  }

  // Prevent flash of unstyled content during hydration by not rendering children until mounted
  // Actually, for PWA speed, we might want to render children but the Document script handles the attribute.
  return (
    <ThemeContext.Provider value={{ theme, switchTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
