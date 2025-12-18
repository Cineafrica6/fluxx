const dotenv = require('dotenv');
dotenv.config();


const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  const validateEnv = () => {
    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  module.exports = { validateEnv };