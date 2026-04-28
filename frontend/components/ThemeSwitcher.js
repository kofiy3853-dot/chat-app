import { useTheme, THEMES } from '../context/ThemeContext'

const themeOptions = [
  {
    id: THEMES.DARK,
    label: 'Dark',
    icon: '🌑',
    preview: '#000000'
  },
  {
    id: THEMES.WHITE,
    label: 'Light',
    icon: '☀️',
    preview: '#FFFFFF'
  },
  {
    id: THEMES.BLUE,
    label: 'Blue',
    icon: '🌊',
    preview: '#001F3F'
  },
]

export default function ThemeSwitcher() {
  const { theme, switchTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2 p-1.5 bg-surface-2/20 backdrop-blur-md rounded-2xl border border-[var(--divider)]">
      {themeOptions.map((t) => (
        <button
          key={t.id}
          onClick={() => switchTheme(t.id)}
          className={`flex-grow flex items-center justify-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 shadow-none ${
            theme === t.id 
              ? 'bg-app text-app-primary shadow-sm ring-1 ring-[var(--divider)]' 
              : 'text-app-muted hover:text-app-secondary hover:bg-surface/5'
          }`}
          aria-label={`Switch to ${t.label} theme`}
          aria-pressed={theme === t.id}
        >
          <div 
            className="w-3.5 h-3.5 rounded-full border border-[var(--divider)] shrink-0" 
            style={{ backgroundColor: t.preview }}
          />
          <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
          {theme === t.id && <div className="w-1 h-1 bg-primary-600 rounded-full" />}
        </button>
      ))}
    </div>
  );
}
