/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      zIndex: {
        15: '15',
        25: '25',
        35: '35',
        45: '45',
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'system-ui', '-apple-system', 'sans-serif'],
        bengali: ['Hind Siliguri', 'sans-serif'],
      },
      colors: {
        cosmos: {
          50: '#edf3ff',
          100: '#d6e4ff',
          200: '#b6cfff',
          300: '#85b0ff',
          400: '#5085ff',
          500: '#2b5cff',
          600: '#1a3bff',
          700: '#1428eb',
          800: '#1522be',
          900: '#172195',
          950: '#02030a',
        },
      },
    },
  },
  plugins: [],
};
