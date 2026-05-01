/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ghana: {
          red: '#CE1126',
          gold: '#FCD116',
          green: '#006B3F',
        },
        methodist: {
          blue: 'var(--theme-primary, #003B5C)',
          gold: 'var(--theme-secondary, #f2aa0d)',
          red: 'var(--theme-warning, #CE1126)',
        },
        /* New semantic mapping for the dynamic multi-tenant architecture */
        theme: {
          primary: 'var(--theme-primary, #003B5C)',
          secondary: 'var(--theme-secondary, #f2aa0d)',
          warning: 'var(--theme-warning, #CE1126)',
        }
      },
    },
  },
  plugins: [],
}
