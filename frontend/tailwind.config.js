/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crisis: {
          red: '#ef4444',
          amber: '#f59e0b',
          safe: '#10b981',
          info: '#06b6d4',
        },
      },
    },
  },
  plugins: [],
};
