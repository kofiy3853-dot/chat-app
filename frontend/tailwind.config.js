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
          50: '#eef0ff',
          100: '#dde1ff',
          200: '#bcc5ff',
          300: '#96a4ff',
          400: '#7b87ff',
          500: '#6B73FF',
          600: '#5a60e8',
          700: '#4a4fcf',
          800: '#3b3fb0',
          900: '#2e318c',
        },
        soft: {
          bg: '#f0f2ff',
          card: '#ffffff',
          primary: '#6B73FF',
          secondary: '#8B5CF6',
          accent: '#5B8DEF',
          text: {
            primary: '#1a1d3a',
            secondary: '#6b7280',
          }
        }
      },
      backgroundImage: {
        'soft-gradient': 'linear-gradient(135deg, #6B73FF 0%, #9B59FF 100%)',
        'header-gradient': 'linear-gradient(160deg, #6B73FF 0%, #7B87FF 60%, #9B59FF 100%)',
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

