/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg-mesh-dark)",
        surface: "rgba(30, 32, 40, 0.4)",
        ink: "#F4F7FB",
        muted: "#8A93A5",
        accent: "#FF4E42",
        good: "#3DE24B",
        mid: "#FFDE33",
        low: "#FF4E42",
        strain: "#2E9BFF",
        sleep: "#51B0EA",
        recovery: "#3DE24B",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};
