/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Original GMEE burgundy, crimson and cream palette.
        hermes: {
          red: '#A50E1D',
          'red-bright': '#E11D2E',
          'red-deep': '#6E0713',
          paper: '#E7C9C4',
          blush: '#F5E2DC',
          bone: '#FFF7F2',
          ink: '#1A0608',
          panel: '#2B1015',
          'panel-deep': '#200A0E'
        }
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
