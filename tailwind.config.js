/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        display: ['"Black Han Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          orange: '#ff9500',
          pink:   '#ff6b6b',
          purple: '#7c3aed',
          green:  '#11c068',
          cyan:   '#00c4ff',
          dark:   '#1a1a2e',
        },
      },
    },
  },
  plugins: [],
}
