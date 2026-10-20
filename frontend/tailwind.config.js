/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hydro: {
          950: '#040810',
          900: '#080E1A', // Clean Hydro Deep Blue & Aqua Slate
          850: '#0D1626',
          800: '#111C2E', // Card surface elevated dark marine
          750: '#17253D',
          700: '#1E3252',
          600: '#2A436D',
          500: '#3D5E94',
        },
        aquatic: {
          cyan: '#06B6D4',
          cyanGlow: 'rgba(6, 182, 212, 0.25)',
          blue: '#3B82F6',
          blueGlow: 'rgba(59, 130, 246, 0.25)',
        },
        depletion: {
          red: '#EF4444',
          redGlow: 'rgba(239, 68, 68, 0.25)',
        },
        penalty: {
          amber: '#F59E0B',
          amberGlow: 'rgba(245, 158, 11, 0.25)',
        },
        compliant: {
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.25)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'hydro-glow': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'depletion-glow': '0 0 25px -5px rgba(239, 68, 68, 0.35)',
        'penalty-glow': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'compliant-glow': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'console-hud': 'inset 0 0 20px rgba(6, 182, 212, 0.05), 0 0 20px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-flow': 'wave 4s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
