/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#18181b',       // zinc-900
          surface: '#222225',  // card/sidebar background
          border: '#27272a',   // zinc-800
          hover: '#2d2d31',
          text: '#f4f4f5',     // zinc-100
          muted: '#a1a1aa',    // zinc-400
        }
      }
    },
  },
  plugins: [],
}
