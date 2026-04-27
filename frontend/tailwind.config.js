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
      colors: {
        primary: {
          50:  'var(--primary-50,  #f5f0ff)',
          100: 'var(--primary-100, #ede9fe)',
          200: 'var(--primary-200, #ddd6fe)',
          300: 'var(--primary-300, #c4b5fd)',
          400: 'var(--primary-400, #a78bfa)',
          500: 'var(--primary-500, #8B5CF6)',   // Purple
          600: 'var(--primary-600, #7C3AED)',   // Purple 600
          700: 'var(--primary-700, #6D28D9)',
          800: 'var(--primary-800, #5B21B6)',
          900: 'var(--primary-900, #4C1D95)',
          950: 'var(--primary-950, #2E1065)',
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
          cyan:   'var(--accent-cyan)',
          purple: 'var(--accent-purple)',
        },
        'cloud-white': 'var(--bg-cloud-white)',
        'pure-white':  'var(--bg-pure-white)',
        'soft-mist':   'var(--bg-soft-mist)',
        ktu: {
          orange: '#E77917',
          blue:   '#2E8BC0',
        },
        soft: {
          bg:      '#ffffff',
          card:    '#ffffff',
          primary: '#2E8BC0',
          secondary: '#E77917',
          accent:  '#1a6a92',
          text: {
            primary:   '#111827',
            secondary: '#6b7280',
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

