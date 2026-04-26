/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FDF6F0',
          100: '#F9E8D8',
          200: '#F2CEAD',
          300: '#E8A87A',
          400: '#D9885A',
          500: '#C8855A',
          600: '#B37040',
          700: '#8A5430',
          800: '#5A3820',
          900: '#3A2210',
        },
        espresso: {
          DEFAULT: '#1C1410',
          2: '#2C2018',
          3: '#3D2E22',
          4: '#5A4535',
        },
        creme: {
          DEFAULT: '#FAF8F5',
          2: '#F2EDE6',
          3: '#EDE6DB',
          4: '#E0D5C8',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
