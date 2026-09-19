/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6d28d9",
          light: "#8b5cf6",
          dark: "#4c1d95",
        },
      },
    },
  },
  plugins: [],
};
