module.exports = {
  plugins: {
    '@tailwindcss/postcss': {
      config: './tailwind.config.js', // Explicitly point to your config file
    },
    autoprefixer: {},
  },
}