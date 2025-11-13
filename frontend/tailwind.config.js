/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { 
    extend: {
      colors: {
        // Horizon UI inspired brand colors
        brand: {
          50: '#EFF4FB',
          100: '#D4E2F4',
          200: '#A8C5E9',
          300: '#7DA8DE',
          400: '#518BD3',
          500: '#4318FF', // primary brand color
          600: '#3311DB',
          700: '#240CB7',
          800: '#160793',
          900: '#0A036F',
        },
        navy: {
          50: '#E7EAF0',
          100: '#C4CAD9',
          200: '#A1ABC2',
          300: '#7D8BAB',
          400: '#5A6C94',
          500: '#2B3674', // primary navy
          600: '#222B5D',
          700: '#1A2146',
          800: '#11162F',
          900: '#090C18',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'DM Sans', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      boxShadow: {
        'soft': '0px 18px 40px rgba(112, 144, 176, 0.12)',
        'soft-lg': '0px 18px 40px rgba(112, 144, 176, 0.2)',
      },
    } 
  },
  plugins: [],
}
