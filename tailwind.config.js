/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        quiz: {
          red: '#e21b3c',
          blue: '#1368ce',
          yellow: '#d89e00',
          green: '#26890c',
          purple: '#8854c0',
          dark: '#0f172a',
          card: '#1e293b',
        }
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out 1',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
