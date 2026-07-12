/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        console: {
          bg: '#0B1220',      // sidebar / chrome
          panel: '#111A2B',
          line: '#1E2A3E',
        },
        signal: {
          amber: '#F5A524',   // dispatch / in-progress
          green: '#2ECC71',   // available / good
          red: '#EF4444',     // blocked / suspended / expired
          blue: '#3B82F6',    // informational
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
