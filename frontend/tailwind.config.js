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
          50:  '#e8f4fb',
          100: '#c5e2f3',
          200: '#9fd0ea',
          300: '#6fbde1',
          400: '#50aed9',
          500: '#2E8BC0',   // KTU Sea Blue (primary brand)
          600: '#2E8BC0',   // primary-600 → navy nav, buttons, highlights
          700: '#2478a8',
          800: '#1b648f',
          900: '#104a6a',
        },
        ktu: {
          orange: '#E77917',
          blue:   '#2E8BC0',
        },
        soft: {
          bg:      '#ffffff',
          card:    '#ffffff',
          primary: '#2E8BC0',
          secondary: '#E77917',
          accent:  '#1b648f',
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

