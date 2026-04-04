/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',   // Standard Royal Blue (New Primary)
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        ktu: {
          orange: '#E77917',
          blue:   '#2563eb',
        },
        soft: {
          bg:      '#ffffff',
          card:    '#ffffff',
          primary: '#2563eb',
          secondary: '#E77917',
          accent:  '#1d4ed8',
          text: {
            primary:   '#111827',
            secondary: '#6b7280',
          }
        }
      },
      backgroundImage: {
        'soft-gradient': 'linear-gradient(135deg, #004C84 0%, #005fa6 100%)',
        'header-gradient': 'linear-gradient(160deg, #004C84 0%, #005fa6 60%, #E77917 100%)',
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(0,0,0,0.05)',
        'blue': '0 8px 32px rgba(107,115,255,0.25)',
        'message': '0 2px 8px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'soft': '24px',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}

