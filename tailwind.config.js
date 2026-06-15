/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1419',
        foreground: '#ffffff',
        surface: '#1a1f28',
        'surface-hover': '#242b37',
        primary: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
        },
        secondary: {
          DEFAULT: '#fbbf24',
          hover: '#f59e0b',
        },
        destructive: {
          DEFAULT: '#ef4444',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        info: '#3b82f6',
        border: '#374151',
        muted: '#9ca3af',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
    },
  },
  plugins: [],
}