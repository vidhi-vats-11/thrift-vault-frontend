/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0f",
        surface: "#131318",
        surface2: "#1a1a22",
        line: "#2a2a35",
        lime: "#d4ff3f",
        pink: "#ff3eb5",
        violet: "#8b5cf6",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px rgba(212, 255, 63, 0.25)",
        glowPink: "0 0 25px rgba(255, 62, 181, 0.25)",
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
}
