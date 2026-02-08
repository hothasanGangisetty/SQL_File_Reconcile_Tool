export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#22577A', // Baltic Blue  – sidebar, dark chrome
          700: '#38A3A5', // Tropical Teal – primary accent
          500: '#57CC99', // Emerald      – secondary accent
          300: '#80ED99', // Light Green  – highlights, badges
          100: '#C7F9CC', // Tea Green    – subtle fills
        },
      },
    },
  },
  plugins: [],
}