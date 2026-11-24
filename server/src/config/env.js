/**
 * Quick Sanjeevani - Environment Configuration
 * Validates and exposes application environment variables
 */

const dotenv = require('dotenv');
const path = require('path');
const { cleanEnv, str, port } = require('envalid');

// Load environment files (root .env or server/.env if available)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const env = cleanEnv(process.env, {
  PORT: port({ default: 5000, desc: 'Server listening port' }),
  NODE_ENV: str({
    choices: ['development', 'test', 'production'],
    default: 'development',
    desc: 'Application running environment',
  }),
  MONGODB_URI: str({
    default: 'mongodb://localhost:27017/quick_sanjeevani',
    desc: 'MongoDB connection string URI',
  }),
  JWT_SECRET: str({
    default: 'quick_sanjeevani_jwt_secret_key_2026_whackiest',
    desc: 'Secret key for signing JSON Web Tokens',
  }),
  JWT_EXPIRES_IN: str({
    default: '7d',
    desc: 'JWT token validity duration',
  }),
  MOCK_OTP: str({
    default: '123456',
    desc: 'Mock OTP for authentication in development/test',
  }),
  CORS_ORIGIN: str({
    default: '*',
    desc: 'Allowed CORS origins',
  }),
});

module.exports = env;
