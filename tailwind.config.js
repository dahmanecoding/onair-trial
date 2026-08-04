/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090D12", surface: "#121923", hair: "#263241",
        ink: "#F4F7FB", muted: "#8C99AA",
        good: "#3DE24B", mid: "#FFDE33", low: "#FF4E42",
        ice: "#8FB8D8", strain: "#2E9BFF"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"]
      }
    }
  },
  plugins: []
};
