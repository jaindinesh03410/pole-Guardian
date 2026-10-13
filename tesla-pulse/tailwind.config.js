/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a0f1e',
          800: '#0d1428',
          700: '#111d38',
          600: '#162447',
        },
        electric: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        fault: '#ef4444',
        warning: '#f59e0b',
        safe: '#22c55e',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px #0ea5e9, 0 0 10px #0ea5e9' },
          to: { boxShadow: '0 0 15px #0ea5e9, 0 0 30px #0ea5e9' },
        },
      },
    },
  },
  plugins: [],
}
