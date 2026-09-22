/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#263C28',
        secondary: '#2D442F',
        accent: '#F7C35F',
      },
      fontFamily: {
        sans: ['Poppins_400Regular', 'sans-serif'],
        medium: ['Poppins_500Medium', 'sans-serif'],
        semibold: ['Poppins_600SemiBold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
