/** @type {import('tailwindcss').Config} */
module.exports = {
  // Add this line specifically
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pos: {
          primary: "#6366F1",
          background: {
            light: "#F8FAFC",
            dark: "#0F172A",
          },
        },
      },
    },
  },
  plugins: [],
};
