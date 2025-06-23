/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D1117',
        'bg-secondary': '#161B22',
        'bg-tertiary': '#21262D',
        'border-color': '#30363D',
        'border-light': '#444C56',
        'text-primary': '#E6EDF3',
        'text-secondary': '#7D8590',
        'text-placeholder': '#484F58',
        'accent-blue': '#388BFD',
        'accent-blue-hover': '#58A6FF',
        'glow-blue': 'rgba(88, 166, 255, 0.25)',
        'danger-red': '#DA3633',
        'danger-red-hover': '#F85149',
        'success-green': '#2EA043',
        'success-green-hover': '#3FB950',
        'badge-centering-bg': 'rgba(56, 139, 253, 0.1)',
        'badge-centering-border': '#388BFD',
        'badge-centering-text': '#58A6FF',
        'badge-scaling-bg': 'rgba(63, 185, 80, 0.1)',
        'badge-scaling-border': '#3FB950',
        'badge-scaling-text': '#56D364',
        'badge-euclidean-bg': 'rgba(137, 87, 229, 0.1)',
        'badge-euclidean-border': '#8957E5',
        'badge-euclidean-text': '#A371F7',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'fade-in': 'fade-in 0.8s ease-out forwards',
        'slide-out-left': 'slide-out-left 0.5s ease-in forwards',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-out-left': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-50px)' },
        },
      }
    },
  },
  plugins: [],
}