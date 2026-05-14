/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff', 100: '#dde5ff', 200: '#c3cfff', 300: '#9db0ff',
          400: '#7589ff', 500: '#5865f2', 600: '#4a50e6', 700: '#3d3fcb',
          800: '#3335a6', 900: '#2d3082',
        },
        accent: {
          50: '#fff0f9', 100: '#ffe0f5', 200: '#ffc0ec', 300: '#ff90de',
          400: '#ff50c8', 500: '#ff1fb4', 600: '#e800a0', 700: '#c00082',
          800: '#9d006b', 900: '#82005a',
        },
        surface: {
          DEFAULT: '#0f0f23', card: '#16162a', border: '#2a2a4a',
          hover: '#1e1e38', input: '#1a1a30',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(88,101,242,0.3), transparent)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'counter': 'counter 1s ease-out forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: 0, transform: 'translateX(20px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glow-primary': '0 0 30px rgba(88,101,242,0.3)',
        'glow-accent': '0 0 30px rgba(255,31,180,0.3)',
        'card': '0 4px 32px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 48px rgba(0,0,0,0.5)',
      }
    }
  },
  plugins: [],
};
