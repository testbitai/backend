import { AppConfig } from './config.types';
import dotenv from 'dotenv'

dotenv.config()


const config: AppConfig = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name',
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    verifyEmailExpirationMinutes: 1440,
    accessExpirationMinutes: 15,
    resetPasswordExpirationMinutes: 10,
    refreshExpirationDays: 7,
    accessExpiry: '15m',
    refreshExpiry: '7d',
    verifyEmailExpiry: '1d',
    resetPasswordExpiry: '10m',
    accessExpiryMs: 15 * 60 * 1000,
    refreshExpiryMs: 7 * 24 * 60 * 60 * 1000,
    verifyEmailExpiryMs: 24 * 60 * 60 * 1000,
    resetPasswordExpiryMs: 10 * 60 * 1000,
  },
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  email: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    password: process.env.EMAIL_PASSWORD || 'your-password',
  },
  clientUrl: process.env.CLIENT_URL || 'https://uat-user.imageotory.in',
};

export default config;
