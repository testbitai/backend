export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  verifyEmailExpirationMinutes: number;
  accessExpirationMinutes: number;
  resetPasswordExpirationMinutes: number;
  refreshExpirationDays: number;
  accessExpiry: string;
  refreshExpiry: string;
  verifyEmailExpiry: string;
  resetPasswordExpiry: string;
  accessExpiryMs: number;
  refreshExpiryMs: number;
  verifyEmailExpiryMs: number;
  resetPasswordExpiryMs: number;
}

export interface EmailConfig {
  user: string;
  password: string;
}

export interface AppConfig {
  MONGODB_URI: string;
  env: string;
  jwt: JwtConfig;
  email: EmailConfig;
  clientUrl: string;
  OPENAI_API_KEY: string;
}