/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        'sm':  'none',
        DEFAULT: 'none',
        'md':  'none',
        'lg':  'none',
        'xl':  'none',
        '2xl': 'none',
        'inner': 'none',
      },
      dropShadow: {
        'sm':  '0 0 0 rgba(0,0,0,0)',
        DEFAULT: '0 0 0 rgba(0,0,0,0)',
        'md':  '0 0 0 rgba(0,0,0,0)',
        'lg':  '0 0 0 rgba(0,0,0,0)',
        'xl':  '0 0 0 rgba(0,0,0,0)',
        '2xl': '0 0 0 rgba(0,0,0,0)',
      },
      colors: {
        primary: {
          50:  'var(--primary-50,  #FFF5F5)',
          100: 'var(--primary-100, #FFE3E3)',
          200: 'var(--primary-200, #FFC9C9)',
          300: 'var(--primary-300, #FFA8A8)',
          400: 'var(--primary-400, #FF8282)',
          500: 'var(--primary-500, #FF3B3B)',
          600: 'var(--primary-600, #FF0000)',   // Pure Red
          700: 'var(--primary-700, #E60000)',
          800: 'var(--primary-800, #C90000)',
          900: 'var(--primary-900, #A60000)',
          950: 'var(--primary-950, #8B0000)',   // Dark Red
        },
        'sea-blue':    'var(--sea-blue)',
        'purple':      'var(--purple)',
        'indigo':      'var(--indigo)',
        'deep-indigo': 'var(--deep-indigo)',
        'soft-indigo': 'var(--soft-indigo)',
        'jet-black':   'var(--text-jet-black)',
        'slate-gray':  'var(--text-slate-gray)',
        'cool-gray':   'var(--text-cool-gray)',
        'status': {
          green: 'var(--status-green)',
          amber: 'var(--status-amber)',
          red:   'var(--status-red)',
        },
        'accent': {
          DEFAULT: 'var(--accent)',
          dark:    'var(--accent-dark)',
          light:   'var(--accent-light)',
          cyan:    'var(--accent-cyan)',
          purple:  'var(--accent-purple)',
        },
        'bg': {
          base:    'var(--bg-base)',
          surface: 'var(--bg-surface)',
          'surface-2': 'var(--bg-surface-2)',
          'surface-3': 'var(--bg-surface-3)',
          input:   'var(--input-bg)',
        },
        'app': {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          navbar:    'var(--icon-color)',
        },
        'bubble': {
          sent:     'var(--bubble-sent)',
          received: 'var(--bubble-received)',
        },
        'cloud-white': 'var(--bg-cloud-white)',
        'pure-white':  'var(--bg-pure-white)',
        'soft-mist':   'var(--bg-soft-mist)',
        ktu: {
          orange: '#E77917',
          blue:   '#2E8BC0',
        },
        soft: {
          bg:      'var(--bg-base)',
          card:    'var(--bg-surface)',
          primary: 'var(--accent)',
          secondary: '#E77917',
          accent:  'var(--accent-dark)',
          text: {
            primary:   'var(--text-primary)',
            secondary: 'var(--text-secondary)',
          }
        }
      },
      backgroundImage: {
        'soft-gradient': 'linear-gradient(135deg, #004C84 0%, #005fa6 100%)',
        'header-gradient': 'linear-gradient(160deg, #004C84 0%, #005fa6 60%, #E77917 100%)',
        'indigo-pulse': 'var(--grad-indigo-pulse)',
        'cyan-glow': 'var(--grad-cyan-glow)',
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

  // Performance: skip variants that aren't used
  future: {
    hoverOnlyWhenSupported: true,
  },
}

