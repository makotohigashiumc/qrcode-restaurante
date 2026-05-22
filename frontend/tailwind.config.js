import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Makoto — extraída do logo
        sumi:    { DEFAULT: '#1A1410', 60: 'rgba(26,20,16,0.6)', 25: 'rgba(26,20,16,0.12)' },
        beni:    { DEFAULT: '#C41230', soft: '#F5E8EB', mid: '#E02040' },
        take:    { DEFAULT: '#5C6B3A', soft: '#EDF0E6', mid: '#6E8046' },
        kin:     { DEFAULT: '#9B6E1A', soft: '#F5EDD8', mid: '#B8892A' },
        washi:   { DEFAULT: '#F5F0EB', mid: '#EDE5D8', dark: '#D6CAB8', deep: '#C4B8A4' },
      },
      fontFamily: {
        display: ['"Noto Serif JP"', 'Georgia', 'serif'],
        sans:    ['"Outfit"', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem', letterSpacing: '0.12em' }],
      },
      borderWidth: {
        'half': '0.5px',
      },
    },
  },
  plugins: [],
}
