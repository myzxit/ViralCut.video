import type { Config } from 'tailwindcss';

/**
 * ViralCut design tokens.
 *
 * The palette is deliberately violet/coral rather than the blue-on-grey that most
 * shorts tools default to — brand recognition is the whole point of a landing page.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f0ff',
          100: '#e7e3ff',
          200: '#d1cbff',
          300: '#b0a4ff',
          400: '#8b73ff',
          500: '#6d4dff',
          600: '#5b3df5',
          700: '#4b2ddb',
          800: '#3e26b0',
          900: '#34238c',
        },
        coral: {
          50: '#fff1f3',
          100: '#ffe0e6',
          200: '#ffc6d2',
          300: '#ff9db2',
          400: '#ff6b8c',
          500: '#ff4d6d',
          600: '#ed2450',
          700: '#c8153e',
          800: '#a71539',
          900: '#8e1636',
        },
        mint: {
          50: '#eafff8',
          100: '#cdfdec',
          200: '#a0f8dc',
          300: '#63eec8',
          400: '#26dcaf',
          500: '#00c6a2',
          600: '#00a084',
          700: '#00806c',
          800: '#026557',
          900: '#03534a',
        },
        ink: {
          DEFAULT: '#14121f',
          soft: '#3a3550',
          muted: '#6b6584',
          faint: '#9a95ad',
        },
        canvas: {
          DEFAULT: '#ffffff',
          soft: '#f8f7fc',
          sunk: '#f1eff8',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 18, 31, 0.04), 0 8px 24px -12px rgba(20, 18, 31, 0.12)',
        lift: '0 2px 4px rgba(20, 18, 31, 0.04), 0 24px 48px -20px rgba(91, 61, 245, 0.28)',
        glow: '0 0 0 1px rgba(91, 61, 245, 0.12), 0 20px 60px -24px rgba(91, 61, 245, 0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #5b3df5 0%, #8b5cf6 45%, #ff4d6d 100%)',
        'brand-soft': 'linear-gradient(160deg, #f6f3ff 0%, #fdf2f6 100%)',
      },
      keyframes: {
        'marquee-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'marquee-left': 'marquee-left 48s linear infinite',
        'marquee-right': 'marquee-right 48s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
