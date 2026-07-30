/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cor primária via CSS variable (RGB) — permite trocar o tema
        // futuramente (white-label) sem recompilar. Uso: bg-primary,
        // text-primary, e opacidade com bg-primary/80.
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          fg: 'rgb(var(--color-primary-fg) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
