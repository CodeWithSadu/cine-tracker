/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas:  '#0a0c14',
        surface: '#10131f',
        card:    '#161924',
        border:  '#252a3a',
        accent:  { DEFAULT: '#7c5cfc', light: '#a48afd', dark: '#5538d4' },
        gold:    '#f5c842',
        muted:   '#6b7280',
        subtle:  '#9ca3af',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"DM Sans"', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'card-glow': 'radial-gradient(ellipse at top left, rgba(124,92,252,0.08) 0%, transparent 60%)',
      },
      boxShadow: {
        accent: '0 0 20px rgba(124,92,252,0.25)',
        card:   '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
