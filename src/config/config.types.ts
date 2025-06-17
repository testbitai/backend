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
  env: string;
  jwt: JwtConfig;
  email: EmailConfig;
  clientUrl: string;
}