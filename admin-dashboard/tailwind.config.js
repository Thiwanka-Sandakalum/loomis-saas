/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#6324eb',
        'background-light': '#f6f6f8',
        'background-dark': '#161121',
      },
      fontFamily: {
        'display': ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
