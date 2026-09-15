/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#161310',
        foreground: '#F3EEE4',
        muted: '#9C8F78',
        accent: '#F4A81E',
      },
    },
  },
  plugins: [],
};
