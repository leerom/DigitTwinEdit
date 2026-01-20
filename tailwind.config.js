/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a', // Dark theme background
        surface: '#2a2a2a',    // Panel background
        primary: '#3b82f6',    // Primary blue
        secondary: '#64748b',  // Secondary gray
        accent: '#f59e0b',     // Accent orange
      }
    },
  },
  plugins: [],
}