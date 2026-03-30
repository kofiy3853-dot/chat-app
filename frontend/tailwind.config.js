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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        soft: {
          bg: '#f5f7fb',
          card: '#ffffff',
          primary: '#5B8DEF',
          secondary: '#6C63FF',
          text: {
            primary: '#1f2937',
            secondary: '#6b7280',
          }
        }
      },
      backgroundImage: {
        'soft-gradient': 'linear-gradient(135deg, #5B8DEF, #6C63FF)',
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'soft': '24px',
      }
    },
  },
  plugins: [],
}
