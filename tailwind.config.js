/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          chamGreen: "#00824b",
          chamGold: "#ffd700",
        },
        borderRadius: {
          xl: "1.25rem",
          '2xl': "2rem",
        },
        fontFamily: {
          sans: ['"Montserrat"', "sans-serif"],
        },
      },
    },
    plugins: [],
  };
  