/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cleantech: {
          950: '#030807',
          900: '#050E0C', // Deep Emerald Carbon
          850: '#091814',
          800: '#0E241F', // Card surface obsidian glass
          750: '#14332C',
          700: '#1B4239', // High-tech jade border
          600: '#255A4E',
          500: '#347A6B',
        },
        mint: {
          neon: '#00F5A0', // Electric CleanTech Mint
          glow: 'rgba(0, 245, 160, 0.25)',
          dark: '#00B878',
        },
        aqua: {
          cyan: '#00D9F5', // Cyan Glacier
          glow: 'rgba(0, 217, 245, 0.25)',
          deep: '#0284C7',
        },
        danger: {
          crimson: '#FF4D6D', // Coral Crimson for critical depletion
          glow: 'rgba(255, 77, 109, 0.25)',
        },
        warning: {
          amber: '#FFB800', // Radiant Sun Amber for moderate drawdown & appeal
          glow: 'rgba(255, 184, 0, 0.25)',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'mint-glow': '0 0 30px -5px rgba(0, 245, 160, 0.35)',
        'aqua-glow': '0 0 30px -5px rgba(0, 217, 245, 0.35)',
        'crimson-glow': '0 0 30px -5px rgba(255, 77, 109, 0.35)',
        'amber-glow': '0 0 30px -5px rgba(255, 184, 0, 0.35)',
        'cockpit': 'inset 0 0 30px rgba(0, 245, 160, 0.03), 0 10px 30px -10px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};
