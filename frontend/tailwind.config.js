/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Restrained surfaces, shared across reader and research views.
        hermes: {
          red: '#B8324B',
          'red-bright': '#F58BA0',
          'red-deep': '#92263A',
          paper: '#EEF1F5',
          blush: '#FFFFFF',
          bone: '#F1F4F9',
          ink: '#111722',
          panel: '#1A2332',
          'panel-deep': '#141C28'
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
