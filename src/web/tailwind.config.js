/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Override default red with muted salmon
        red: {
          50: '#fef5f2',
          100: '#fce8e1',
          200: '#f9d1c4',
          300: '#f5b39c',
          400: '#ee9578',
          500: '#E9967A', // Muted salmon
          600: '#e4775a',
          700: '#CD7F5E', // Darker salmon for hover
          800: '#b8673f',
          900: '#9b5434',
        },
        // Brand colors
        brand: {
          50: '#fef5f2',
          100: '#fee8e2',
          200: '#fdd5ca',
          300: '#fab8a5',
          400: '#f6926f',
          500: '#f16b5a', // Primary brand coral
          600: '#e04533',
          700: '#bc3426',
          800: '#9b2e23',
          900: '#802a23',
        },
        // Semantic colors
        primary: {
          DEFAULT: '#f16b5a',
          25: '#fefcfb',
          50: '#fef5f2',
          100: '#fee8e2',
          200: '#fdd5ca',
          300: '#fab8a5',
          400: '#f6926f',
          500: '#f16b5a',
          600: '#e04533',
          700: '#bc3426',
          800: '#9b2e23',
          900: '#802a23',
          950: '#4a1511',
          foreground: '#ffffff',
        },
        // Neutral grays
        neutral: {
          25: '#fcfcfc',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#2d2d2d',
          850: '#1f1f1f',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Success
        success: {
          DEFAULT: '#10b981',
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Warning
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Error
        error: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      // Typography
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.6' }],
        xl: ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.4' }],
      },
      // Border radius
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        DEFAULT: '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      // Font families
      fontFamily: {
        sans: [
          'SF Pro Display',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'Roboto Mono',
          'Courier New',
          'monospace'
        ],
      },
      // Animations
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%) translateX(-50%)', opacity: '0' },
          '100%': { transform: 'translateY(0) translateX(-50%)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
