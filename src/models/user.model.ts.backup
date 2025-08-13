import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ========== INTERFACES & TYPES ========== //

export enum UserRole {
  STUDENT = 'student',
  TUTOR = 'tutor',
  ADMIN = 'admin',
}

export enum ExamGoal {
  JEE = 'JEE',
  BITSAT = 'BITSAT',
}

export enum StudyBuddyLevel {
  TRAINEE = 'Trainee',
  APPRENTICE = 'Apprentice',
  MASTER = 'Master',
  GURU = 'Guru',
}

interface Badge {
  badgeId: mongoose.Types.ObjectId;
  earnedAt: Date;
}

interface Streak {
  count: number;
  lastActive: Date;
}

interface InviteCode {
  code: string;
  password: string;
  expiresAt: Date;
}

interface TutorDetails {
  paymentId?: string;
  examFocus?: ExamGoal[];
  students?: mongoose.Types.ObjectId[];
  inviteCodes?: InviteCode[];
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  studyBuddy: {
    name: string;
    style: string;
    level: StudyBuddyLevel;
  };
  examGoals: ExamGoal[];
  isEmailVerified: boolean;
  isActive: boolean;
  coins: number;
  badges: Badge[];
  streak: Streak;
  tutorDetails?: TutorDetails;
  createdAt: Date;
  updatedAt: Date;

  // METHODS
  isPasswordMatch(password: string): Promise<boolean>;
}

interface UserModel extends Model<UserDocument> {
  // STATICS
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;
  paginate(filter: any, options: any): Promise<any>;
}

// ========== SCHEMA DEFINITION ========== //

const userSchema: Schema<UserDocument> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      default: UserRole.STUDENT,
    },
    avatar: { type: String, default: 'placeholder.svg' },
    studyBuddy: {
      name: { type: String, default: 'Study Buddy' },
      style: { type: String, default: 'default' },
      level: { 
        type: String, 
        enum: Object.values(StudyBuddyLevel), 
        default: StudyBuddyLevel.TRAINEE,
      },
    },
    examGoals: [{ 
      type: String, 
      enum: Object.values(ExamGoal),
    }],
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    coins: { type: Number, default: 50 },
    badges: [{
      badgeId: { type: Schema.Types.ObjectId, ref: 'Badge' },
      earnedAt: { type: Date, default: Date.now },
    }],
    streak: {
      count: { type: Number, default: 0 },
      lastActive: { type: Date },
    },
    tutorDetails: {
      paymentId: String,
      examFocus: [{ type: String, enum: Object.values(ExamGoal) }],
      students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      inviteCodes: [{
        code: String,
        password: String,
        expiresAt: Date,
      }],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ========== INDEXES ========== //
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ 'tutorDetails.students': 1 });

// ========== PRE-SAVE HOOKS ========== //

/** Hash password before saving */
userSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// ========== METHODS ========== //

/** Check if password matches */
userSchema.methods.isPasswordMatch = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// ========== STATICS ========== //

/** Check if email is already taken */
userSchema.statics.isEmailTaken = async function (
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/** Paginate users (for admin dashboard) */
userSchema.statics.paginate = async function (
  filter: any,
  options: { page?: number; limit?: number; sortBy?: string }
) {
  const limit = options.limit || 10;
  const page = options.page || 1;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || '-createdAt';

  const countPromise = this.countDocuments(filter).exec();
  const usersPromise = this.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .exec();

  const [totalResults, results] = await Promise.all([countPromise, usersPromise]);
  const totalPages = Math.ceil(totalResults / limit);

  return { results, page, limit, totalPages, totalResults };
};

// ========== MODEL ========== //
const User: UserModel = mongoose.model<UserDocument, UserModel>('User', userSchema);

export default User;