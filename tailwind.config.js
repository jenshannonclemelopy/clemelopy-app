/** @type {import('tailwindcss').Config} */
module.exports = {

  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Your Clemelopy brand colors
        'clemelopy-orange': '#FAA819',
        'clemelopy-orange-dark': '#E99502',
        'clemelopy-teal': '#00A99D',
        'clemelopy-teal-dark': '#0D7871',
        'clemelopy-cream': '#fffaf3',
      },
      fontFamily: {
        'montserrat': ['Montserrat Alternates', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}