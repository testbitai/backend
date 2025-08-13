import mongoose, { Document, Model, Schema } from "mongoose";

export enum RewardType {
  BADGE = 'badge',
  COIN = 'coin',
  ACHIEVEMENT = 'achievement',
  STREAK = 'streak',
  LEVEL = 'level'
}

export enum RewardCategory {
  PERFORMANCE = 'performance',
  ENGAGEMENT = 'engagement',
  MILESTONE = 'milestone',
  SPECIAL = 'special',
  SEASONAL = 'seasonal'
}

export enum RewardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

export interface RewardCriteria {
  type: 'score' | 'tests_completed' | 'streak' | 'login_days' | 'custom';
  operator: 'gte' | 'lte' | 'eq' | 'between';
  value: number | number[];
  description: string;
}

export interface RewardDocument extends Document {
  name: string;
  description: string;
  type: RewardType;
  category: RewardCategory;
  status: RewardStatus;
  icon: string;
  image?: string;
  color: string;
  coinValue: number;
  criteria: RewardCriteria[];
  isAutoAwarded: boolean;
  maxAwards?: number;
  validFrom?: Date;
  validUntil?: Date;
  createdBy: mongoose.Types.ObjectId;
  totalAwarded: number;
  isVisible: boolean;
  sortOrder: number;
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard' | 'legendary';
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    tags?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRewardDocument extends Document {
  user: mongoose.Types.ObjectId;
  reward: mongoose.Types.ObjectId;
  awardedAt: Date;
  awardedBy?: mongoose.Types.ObjectId;
  reason?: string;
  metadata?: {
    scoreAchieved?: number;
    testId?: mongoose.Types.ObjectId;
    streakCount?: number;
  };
}

const rewardCriteriaSchema = new Schema<RewardCriteria>(
  {
    type: {
      type: String,
      enum: ['score', 'tests_completed', 'streak', 'login_days', 'custom'],
      required: true
    },
    operator: {
      type: String,
      enum: ['gte', 'lte', 'eq', 'between'],
      required: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const rewardSchema = new Schema<RewardDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    type: {
      type: String,
      enum: Object.values(RewardType),
      required: true
    },
    category: {
      type: String,
      enum: Object.values(RewardCategory),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(RewardStatus),
      default: RewardStatus.DRAFT
    },
    icon: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    color: {
      type: String,
      required: true,
      default: '#3b82f6'
    },
    coinValue: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    criteria: [rewardCriteriaSchema],
    isAutoAwarded: {
      type: Boolean,
      default: false
    },
    maxAwards: {
      type: Number,
      min: 1
    },
    validFrom: {
      type: Date
    },
    validUntil: {
      type: Date
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    totalAwarded: {
      type: Number,
      default: 0,
      min: 0
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    metadata: {
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'legendary']
      },
      rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary']
      },
      tags: [String]
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const userRewardSchema = new Schema<UserRewardDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reward: {
      type: Schema.Types.ObjectId,
      ref: 'Reward',
      required: true
    },
    awardedAt: {
      type: Date,
      default: Date.now
    },
    awardedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      maxlength: 200
    },
    metadata: {
      scoreAchieved: Number,
      testId: {
        type: Schema.Types.ObjectId,
        ref: 'Test'
      },
      streakCount: Number
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
rewardSchema.index({ status: 1, category: 1 });
rewardSchema.index({ createdBy: 1 });
rewardSchema.index({ sortOrder: 1 });
rewardSchema.index({ validFrom: 1, validUntil: 1 });

userRewardSchema.index({ user: 1, reward: 1 }, { unique: true });
userRewardSchema.index({ user: 1, awardedAt: -1 });
userRewardSchema.index({ reward: 1 });

// Static methods
rewardSchema.statics.findActiveRewards = function() {
  return this.find({
    status: RewardStatus.ACTIVE,
    $and: [
      {
        $or: [
          { validFrom: { $exists: false } },
          { validFrom: { $lte: new Date() } }
        ]
      },
      {
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: { $gte: new Date() } }
        ]
      }
    ]
  }).sort({ sortOrder: 1, createdAt: -1 });
};

// Instance methods
rewardSchema.methods.isValidNow = function(): boolean {
  const now = new Date();
  const validFrom = !this.validFrom || this.validFrom <= now;
  const validUntil = !this.validUntil || this.validUntil >= now;
  return this.status === RewardStatus.ACTIVE && validFrom && validUntil;
};

rewardSchema.methods.canBeAwarded = function(): boolean {
  if (!this.isValidNow()) return false;
  if (this.maxAwards && this.totalAwarded >= this.maxAwards) return false;
  return true;
};

const RewardModel: Model<RewardDocument> = mongoose.model<RewardDocument>("Reward", rewardSchema);
const UserRewardModel: Model<UserRewardDocument> = mongoose.model<UserRewardDocument>("UserReward", userRewardSchema);

export { RewardModel as default, UserRewardModel };
