import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Brand accent colors */
        green: '#2D6A4F',
        'green-l': '#74C69D',
        'green-xl': '#B7E4C7',
        'green-bg': '#D1FAE5',
        blue: '#2563EB',
        'blue-l': '#3B82F6',
        purple: '#7C3AED',
        'purple-l': '#A78BFA',
        amber: '#D97706',
        'amber-l': '#F59E0B',
        red: '#DC2626',
        'red-l': '#EF4444',
        teal: '#0D9488',
        'teal-l': '#14B8A6',

        /* Light theme surfaces */
        surface: '#FAFAFA',
        'surface-2': '#FFFFFF',
        'surface-3': '#F3F4F6',
        border: '#E5E7EB',
        'border-2': '#D1D5DB',

        /* Text hierarchy */
        text: '#1A1A2E',
        'text-2': '#4B5563',
        'text-3': '#9CA3AF',
        'text-4': '#6B7280',

        /* Sidebar dark tokens */
        sidebar: '#1A1A2E',

        /* Semantic tokens */
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-light': 'var(--color-primary-light)',
        secondary: 'var(--color-secondary)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
