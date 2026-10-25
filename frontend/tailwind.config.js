/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2D4A3E",
          foreground: "#FDFCF8",
          light: "#3D6B57",
        },
        accent: {
          DEFAULT: "#C97B4F",
          light: "#D49968",
        },
        sand: {
          DEFAULT: "#F5F0E6",
          dark: "#E8DFCE",
        },
        card: "#FFFCF7",
        border: "#E2D9C8",
        muted: {
          DEFAULT: "#8B8074",
          foreground: "#6B6056",
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
