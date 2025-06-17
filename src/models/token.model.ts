import mongoose, { Document, Model, Schema } from 'mongoose';
import { UserDocument } from './user.model';

// Token type definitions
export enum TokenType {
  REFRESH = 'refresh',
  RESET_PASSWORD = 'resetPassword',
  VERIFY_EMAIL = 'verifyEmail',
  ACCESS = 'access'
}

// Interface for Token document
export interface TokenDocument extends Document {
  token: string;
  user: UserDocument['_id'];
  type: TokenType;
  expires: Date;
  blacklisted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Token model
interface TokenModel extends Model<TokenDocument> {
  isTokenValid: (token: string, type: TokenType) => Promise<TokenDocument | null>;
  deleteAllForUser: (userId: string, type?: TokenType) => Promise<void>;
}

// Token schema definition
const tokenSchema: Schema<TokenDocument> = new Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
      unique: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(TokenType),
      required: true
    },
    expires: {
      type: Date,
      required: true
    },
    blacklisted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret._id;
        return ret;
      }
    }
  }
);

// Index for faster querying
tokenSchema.index({ user: 1, type: 1 });

/**
 * Check if token is valid (exists, not blacklisted, and not expired)
 */
tokenSchema.statics.isTokenValid = async function (
  token: string,
  type: TokenType
): Promise<TokenDocument | null> {
  const tokenDoc = await this.findOne({
    token,
    type,
    blacklisted: false,
    expires: { $gt: new Date() }
  });
  return tokenDoc;
};

/**
 * Delete all tokens for a user (optionally filtered by type)
 */
tokenSchema.statics.deleteAllForUser = async function (
  userId: string,
  type?: TokenType
): Promise<void> {
  const query: any = { user: userId };
  if (type) {
    query.type = type;
  }
  await this.deleteMany(query);
};

/**
 * Pre-save hook to ensure clean data
 */
tokenSchema.pre<TokenDocument>('save', function (next) {
  if (this.isModified('token')) {
    this.token = this.token.trim();
  }
  next();
});

const Token: TokenModel = mongoose.model<TokenDocument, TokenModel>('Token', tokenSchema);

export default Token;