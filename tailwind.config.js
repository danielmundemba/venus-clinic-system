/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        venus: {
          bg: {
            primary: '#0B1120',
            secondary: '#151E32',
            tertiary: '#1E293B',
            elevated: '#243447',
          },
          primary: {
            400: '#38BDF8',
            500: '#0EA5E9',
            600: '#0284C7',
          },
          text: {
            primary: '#F8FAFC',
            secondary: '#CBD5E1',
            muted: '#64748B',
            disabled: '#475569',
          },
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#8B5CF6',
          border: {
            DEFAULT: '#334155',
            hover: '#475569',
            focus: '#0EA5E9',
          }
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-lg': '0 0 30px rgba(14, 165, 233, 0.2)',
      }
    },
  },
  plugins: [],
}