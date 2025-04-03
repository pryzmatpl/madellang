import Dotenv from 'dotenv-webpack';
const path = require('path');
module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins:[
    new Dotenv({
      path: './.env', // optional, defaults to '.env'
      safe: false, // set to true if you want to load .env.example and validate
      systemvars: true, // load system environment variables
    }),
  ]
};