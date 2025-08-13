import nodemailer from "nodemailer";
import config from "../config/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  port: 465,
  host: "smtp.gamil.com",
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${config.clientUrl}/verify-email?token=${token}`;
console.log(verificationUrl)
  await transporter.sendMail({
    to: email,
    subject: "Verify Your Email",
    html: `Click <a href="${verificationUrl}">here</a> to verify your email.`,
  });
};

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    to: email,
    subject: "Reset Your Password",
    html: `Click <a href="${resetUrl}">here</a> to reset your password.`,
  });
};

export default {
  sendVerificationEmail,
  sendResetPasswordEmail,
};
