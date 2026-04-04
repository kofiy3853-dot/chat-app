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
          50:  '#f0faff',
          100: '#e0f5ff',
          200: '#baeaff',
          300: '#7ccbff',
          400: '#3abef9',   // Light Sky Blue (New Primary)
          500: '#3abef9',   // Primary brand
          600: '#00a3ff',   // Vibrant deep sky blue
          700: '#0085d6',
          800: '#0067a9',
          900: '#004a7c',
        },
        ktu: {
          orange: '#E77917',
          blue:   '#3ABEF9',
        },
        soft: {
          bg:      '#ffffff',
          card:    '#ffffff',
          primary: '#3ABEF9',
          secondary: '#E77917',
          accent:  '#00a3ff',
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

