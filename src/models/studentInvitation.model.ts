import mongoose, { Document, Model, Schema } from 'mongoose';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export interface StudentInvitationDocument extends Document {
  tutorId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  inviteCode: string;
  inviteLink: string;
  studentEmail?: string;
  studentName?: string;
  status: InvitationStatus;
  message?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface StudentInvitationModel extends Model<StudentInvitationDocument> {
  generateInviteCode(): string;
  isCodeValid(code: string): Promise<boolean>;
}

const studentInvitationSchema: Schema<StudentInvitationDocument> = new Schema(
  {
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inviteLink: {
      type: String,
      required: true,
    },
    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    studentName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    acceptedAt: Date,
    rejectedAt: Date,
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
studentInvitationSchema.index({ tutorId: 1, status: 1 });
studentInvitationSchema.index({ inviteCode: 1 });
studentInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static Methods
studentInvitationSchema.statics.generateInviteCode = function (): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

studentInvitationSchema.statics.isCodeValid = async function (code: string): Promise<boolean> {
  const invitation = await this.findOne({
    inviteCode: code,
    status: InvitationStatus.PENDING,
    expiresAt: { $gt: new Date() },
  });
  return !!invitation;
};

// Pre-save middleware to generate invite link
studentInvitationSchema.pre<StudentInvitationDocument>('save', function (next) {
  if (this.isNew && !this.inviteLink && this.inviteCode) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.inviteLink = `${frontendUrl}/join/${this.inviteCode}`;
  }
  next();
});

const StudentInvitation: StudentInvitationModel = mongoose.model<
  StudentInvitationDocument,
  StudentInvitationModel
>('StudentInvitation', studentInvitationSchema);

export default StudentInvitation;
