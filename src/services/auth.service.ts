import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import User from "../models/user.model";
import Token from "../models/token.model";
import emailService from "./email.service";
import config from "../config/config";
import { ApiError } from "../utils/apiError";
import { tokenTypes } from "../constants/tokens";

class AuthService {
  public registerUser = async (data: any) => {
    const { email, password, name, role = "student", examGoals } = data;

    if (await User.isEmailTaken(email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }

    const user = await User.create({ name, email, password, role, examGoals });

    const verifyToken = jwt.sign(
      { userId: user._id, type: tokenTypes.VERIFY_EMAIL },
      config.jwt.secret,
      { expiresIn: config.jwt.verifyEmailExpiryMs }
    );

    await Token.create({
      token: verifyToken,
      user: user._id,
      type: tokenTypes.VERIFY_EMAIL,
      expires: new Date(Date.now() + config.jwt.verifyEmailExpiryMs),
    });

    await emailService.sendVerificationEmail(user.email, verifyToken);

    const tokens = await this.generateAuthTokens(user);

    return { user, tokens };
  };

  public loginUser = async (email: string, password: string) => {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.isPasswordMatch(password))) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Incorrect email or password"
      );
    }

    if (!user.isEmailVerified && user.role !== "admin") {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Please verify your email first"
      );
    }

    const tokens = await this.generateAuthTokens(user);
    await this.updateStreak((user._id as string).toString());

    return { user, tokens };
  };

  public logoutUser = async (refreshToken: string) => {
    await Token.findOneAndDelete({
      token: refreshToken,
      type: tokenTypes.REFRESH,
    });
  };

  public refreshAuthTokens = async (refreshToken: string) => {
    const tokenDoc = await Token.findOne({
      token: refreshToken,
      type: tokenTypes.REFRESH,
    });
    if (!tokenDoc || tokenDoc.blacklisted) {
      throw new ApiError(httpStatus.FORBIDDEN, "Invalid refresh token");
    }

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
      userId: string;
    };
    const user = await User.findById(payload.userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    await tokenDoc.deleteOne();
    return await this.generateAuthTokens(user);
  };

  public sendForgotPasswordEmail = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    const resetToken = jwt.sign(
      { userId: user._id, type: tokenTypes.RESET_PASSWORD },
      config.jwt.secret,
      { expiresIn: config.jwt.resetPasswordExpiryMs }
    );

    await Token.create({
      token: resetToken,
      user: user._id,
      type: tokenTypes.RESET_PASSWORD,
      expires: new Date(Date.now() + config.jwt.resetPasswordExpiryMs),
    });

    await emailService.sendResetPasswordEmail(user.email, resetToken);
  };

  public resetUserPassword = async (token: string, newPassword: string) => {
    const tokenDoc = await Token.findOne({
      token,
      type: tokenTypes.RESET_PASSWORD,
    });

    if (!tokenDoc || tokenDoc.expires < new Date()) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired token");
    }

    const user = await User.findById(tokenDoc.user);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    user.password = newPassword;
    await user.save();
    await tokenDoc.deleteOne();
  };

  public verifyUserEmail = async (token: string) => {
    const tokenDoc = await Token.findOne({
      token,
      type: tokenTypes.VERIFY_EMAIL,
    });

    if (!tokenDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid token");
    }

    const user = await User.findById(tokenDoc.user);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    user.isEmailVerified = true;
    await user.save();
    await tokenDoc.deleteOne();
  };

  public resendVerificationEmail = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    if (user.isEmailVerified) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Email already verified");
    }

    await Token.deleteMany({ user: user._id, type: tokenTypes.VERIFY_EMAIL });

    const verifyToken = jwt.sign(
      { userId: user._id, type: tokenTypes.VERIFY_EMAIL },
      config.jwt.secret,
      { expiresIn: config.jwt.verifyEmailExpiryMs }
    );

    await Token.create({
      token: verifyToken,
      user: user._id,
      type: tokenTypes.VERIFY_EMAIL,
      expires: new Date(Date.now() + config.jwt.verifyEmailExpiryMs),
    });

    await emailService.sendVerificationEmail(user.email, verifyToken);
  };

  private generateAuthTokens = async (user: any) => {
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiryMs }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiryMs }
    );

    await Token.create({
      token: refreshToken,
      user: user._id,
      type: tokenTypes.REFRESH,
      expires: new Date(Date.now() + config.jwt.refreshExpiryMs),
    });

    return { accessToken, refreshToken };
  };

  private updateStreak = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) return;

    const today = new Date();
    const lastActive = user.streak.lastActive;

    if (!lastActive || lastActive.toDateString() !== today.toDateString()) {
      user.streak.count += 1;
      user.streak.lastActive = today;

      if (user.streak.count % 5 === 0) {
        user.coins += 50;
      }

      await user.save();
    }
  };
}

export default new AuthService();
