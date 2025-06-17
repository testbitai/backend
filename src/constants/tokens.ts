import jwt from 'jsonwebtoken';
import config from '../config/config';
import Token from '../models/token.model';
import User, { UserDocument } from '../models/user.model';
import httpStatus from 'http-status';
import { ApiError } from '../utils/apiError';

/**
 * Token Types
 */
export const tokenTypes = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET_PASSWORD: 'resetPassword',
  VERIFY_EMAIL: 'verifyEmail',
} as const;

/**
 * Token Payload Interface
 */
export interface TokenPayload {
  userId: string;
  type: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT Token
 * @param {string} userId - User ID
 * @param {Date} expires - Expiration time
 * @param {string} type - Token type
 * @param {string} [secret] - Optional secret override
 * @returns {string} Signed JWT token
 */
export const generateToken = (
  userId: string,
  expires: Date,
  type: string,
  secret: string = config.jwt.secret
): string => {
  const payload: TokenPayload = {
    userId,
    type,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expires.getTime() / 1000),
  };

  return jwt.sign(payload, secret);
};

/**
 * Verify JWT Token
 * @param {string} token - JWT token to verify
 * @param {string} type - Expected token type
 * @returns {Promise<TokenPayload>} Decoded token payload
 */
export const verifyToken = async (
  token: string,
  type: string
): Promise<TokenPayload> => {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
    
    // Check token type matches
    if (payload.type !== type) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
    }

    // Check if token exists in database (for stateful tokens)
    const tokenDoc = await Token.findOne({
      token,
      type,
      user: payload.userId,
      blacklisted: false,
    });

    if (!tokenDoc) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }
    throw error;
  }
};

/**
 * Generate auth tokens (access + refresh)
 * @param {UserDocument} user - User document
 * @returns {Promise<{access: {token: string, expires: Date}, refresh: {token: string, expires: Date}}>}
 */
export const generateAuthTokens = async (
  user: UserDocument
): Promise<{
  access: { token: string; expires: Date };
  refresh: { token: string; expires: Date };
}> => {
  // Access token (15 min expiry)
  const accessTokenExpires = new Date(
    Date.now() + config.jwt.accessExpirationMinutes * 60 * 1000
  );
  const accessToken = generateToken(
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS
  );

  // Refresh token (7 days expiry)
  const refreshTokenExpires = new Date(
    Date.now() + config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000
  );
  const refreshToken = generateToken(
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH,
    config.jwt.refreshSecret
  );

  // Save refresh token to database
  await Token.create({
    token: refreshToken,
    user: user.id,
    type: tokenTypes.REFRESH,
    expires: refreshTokenExpires,
  });

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires,
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires,
    },
  };
};

/**
 * Blacklist a token
 * @param {string} token - Token to blacklist
 * @returns {Promise<void>}
 */
export const blacklistToken = async (token: string): Promise<void> => {
  await Token.findOneAndUpdate(
    { token },
    { blacklisted: true },
    { upsert: true }
  );
};

/**
 * Delete all tokens for a user
 * @param {string} userId - User ID
 * @param {string} [type] - Optional token type filter
 * @returns {Promise<void>}
 */
export const deleteTokensForUser = async (
  userId: string,
  type?: string
): Promise<void> => {
  const query: any = { user: userId };
  if (type) {
    query.type = type;
  }
  await Token.deleteMany(query);
};

/**
 * Generate reset password token
 * @param {string} email - User email
 * @returns {Promise<string>} Generated token
 */
export const generateResetPasswordToken = async (
  email: string
): Promise<string> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No user found with this email');
  }

  const expires = new Date(
    Date.now() + config.jwt.resetPasswordExpirationMinutes * 60 * 1000
  );
  const resetPasswordToken = generateToken(
    user.id,
    expires,
    tokenTypes.RESET_PASSWORD
  );

  await Token.create({
    token: resetPasswordToken,
    user: user.id,
    type: tokenTypes.RESET_PASSWORD,
    expires,
  });

  return resetPasswordToken;
};

/**
 * Generate email verification token
 * @param {UserDocument} user - User document
 * @returns {Promise<string>} Generated token
 */
export const generateVerifyEmailToken = async (
  user: UserDocument
): Promise<string> => {
  const expires = new Date(
    Date.now() + config.jwt.verifyEmailExpirationMinutes * 60 * 1000
  );
  const verifyEmailToken = generateToken(
    user.id,
    expires,
    tokenTypes.VERIFY_EMAIL
  );

  await Token.create({
    token: verifyEmailToken,
    user: user.id,
    type: tokenTypes.VERIFY_EMAIL,
    expires,
  });

  return verifyEmailToken;
};

export default {
  tokenTypes,
  generateToken,
  verifyToken,
  generateAuthTokens,
  blacklistToken,
  deleteTokensForUser,
  generateResetPasswordToken,
  generateVerifyEmailToken,
};