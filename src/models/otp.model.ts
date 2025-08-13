import mongoose, { Document, Model, Schema } from 'mongoose';

export interface OTPDocument extends Document {
  email: string;
  otp: string;
  type: 'email_verification' | 'password_reset' | 'tutor_verification';
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

interface OTPModel extends Model<OTPDocument> {
  generateOTP(): string;
  verifyOTP(email: string, otp: string, type: string): Promise<boolean>;
  cleanupExpired(): Promise<void>;
}

const otpSchema: Schema<OTPDocument> = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    otp: {
      type: String,
      required: true,
      length: 6,
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset', 'tutor_verification'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// ========== INDEXES ========== //
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ========== STATICS ========== //

/** Generate a 6-digit OTP */
otpSchema.statics.generateOTP = function (): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/** Verify OTP */
otpSchema.statics.verifyOTP = async function (
  email: string,
  otp: string,
  type: string
): Promise<boolean> {
  const otpDoc = await this.findOne({
    email,
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpDoc) {
    return false;
  }

  // Mark as used
  otpDoc.isUsed = true;
  await otpDoc.save();

  return true;
};

/** Clean up expired OTPs */
otpSchema.statics.cleanupExpired = async function (): Promise<void> {
  await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true },
      { attempts: { $gte: 5 } },
    ],
  });
};

const OTP: OTPModel = mongoose.model<OTPDocument, OTPModel>('OTP', otpSchema);

export default OTP;
