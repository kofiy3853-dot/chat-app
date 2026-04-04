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
          50: '#eef4ff',
          100: '#dae7ff',
          200: '#bdd5ff',
          300: '#90bcff',
          400: '#5da0ff',
          500: '#005fa6',
          600: '#004C84', // Official KTU Blue
          700: '#003a64',
          800: '#063252',
          900: '#0a2c47',
        },
        ktu: {
          orange: '#E77917', // Official KTU Orange
          blue: '#004C84',
        },
        soft: {
          bg: '#f8faff',
          card: '#ffffff',
          primary: '#004C84',
          secondary: '#E77917',
          accent: '#005fa6',
          text: {
            primary: '#0a2c47',
            secondary: '#64748b',
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

