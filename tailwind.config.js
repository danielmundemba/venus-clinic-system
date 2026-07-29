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
            primary: 'var(--venus-bg-primary)',
            secondary: 'var(--venus-bg-secondary)',
            tertiary: 'var(--venus-bg-tertiary)',
            elevated: 'var(--venus-bg-elevated)',
          },
          primary: {
            400: 'var(--venus-primary-400)',
            500: 'var(--venus-primary-500)',
            600: 'var(--venus-primary-600)',
          },
          text: {
            primary: 'var(--venus-text-primary)',
            secondary: 'var(--venus-text-secondary)',
            muted: 'var(--venus-text-muted)',
            disabled: 'var(--venus-text-disabled)',
          },
          success: 'var(--venus-success)',
          warning: 'var(--venus-warning)',
          danger: 'var(--venus-danger)',
          info: 'var(--venus-info)',
          border: {
            DEFAULT: 'var(--venus-border-default)',
            hover: 'var(--venus-border-hover)',
            focus: 'var(--venus-border-focus)',
          }
        }
      },
      boxShadow: {
        glow: '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-lg': '0 0 30px rgba(14, 165, 233, 0.2)',
      }
    },
  },
  plugins: [],
}