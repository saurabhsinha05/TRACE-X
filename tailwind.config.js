/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#080B10',
          900: '#0B0F16',
          800: '#0F141D',
          700: '#141B26',
          600: '#1B2330',
          500: '#242D3D',
        },
        line: {
          DEFAULT: '#1D2733',
          soft: '#161E29',
        },
        ink: {
          DEFAULT: '#E7ECF3',
          muted: '#8D98AC',
          faint: '#5C6779',
        },
        signal: {
          cyan: '#3ED7D1',
          blue: '#4C8EF7',
          amber: '#E8A94C',
          red: '#E5636A',
          green: '#4FBE8E',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        scan: 'repeating-linear-gradient(0deg, rgba(62,215,209,0.035) 0px, rgba(62,215,209,0.035) 1px, transparent 1px, transparent 3px)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        sweep: 'sweep 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
