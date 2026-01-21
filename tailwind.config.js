/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "Microsoft YaHei", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        // Design system colors from code.html
        primary: "#3b82f6",
        accent: "#f59e0b",
        'bg-dark': "#0c0e14",
        'panel-dark': "#161922",
        'border-dark': "#2d333f",
        'header-dark': "#1e222d",

        // Mappings for existing components to new palette
        'accent-blue': '#3b82f6', // Map to primary
        'panel-header': '#1e222d', // Map to header-dark
        'text-primary': '#cbd5e1', // slate-300
        'text-secondary': '#64748b', // slate-500
        'hover-bg': '#334155', // slate-700
        'input-bg': '#0c0e14', // bg-dark
      }
    },
  },
  plugins: [],
}