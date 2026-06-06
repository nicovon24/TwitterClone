import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        x: {
          // Constant brand colors
          blue: '#1d9bf0',
          bluehover: '#1a8cd8',
          like: '#f91880',
          // Theme-aware semantic tokens (driven by CSS vars in globals.css)
          bg: 'var(--bg)',
          bgblur: 'var(--bg-blur)',
          card: 'var(--card)',
          hover: 'var(--hover)',
          fg: 'var(--fg)',
          muted: 'var(--muted)',
          line: 'var(--line)',
          solid: 'var(--solid)',
          solidfg: 'var(--solidfg)',
          // Legacy aliases (also theme-aware) so older class names keep working
          black: 'var(--fg)',
          gray: 'var(--muted)',
          border: 'var(--line)',
          light: 'var(--card)',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
