import mongoose, { Document, Model, Schema } from "mongoose";

/* ==========================
    ENUMS
========================== */

export const SupportCategory = [
  "Technical",
  "Billing",
  "Account",
  "Content",
  "General",
] as const;
export type SupportCategoryType = (typeof SupportCategory)[number];

export const SupportPriority = [
  "Low",
  "Medium",
  "High",
] as const;
export type SupportPriorityType = (typeof SupportPriority)[number];

export const SupportStatus = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
] as const;
export type SupportStatusType = (typeof SupportStatus)[number];

/* ==========================
    INTERFACES
========================== */

export interface SupportTicketDocument extends Document {
  ticketId: string;
  subject: string;
  category: SupportCategoryType;
  priority: SupportPriorityType;
  description: string;
  status: SupportStatusType;
  createdBy: mongoose.Types.ObjectId;
  resolvedBy?: mongoose.Types.ObjectId | null;
  resolutionNotes?: string;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ==========================
    SUPPORT TICKET SCHEMA
========================== */

const supportTicketSchema = new Schema<SupportTicketDocument>(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: SupportCategory,
      required: true,
    },
    priority: {
      type: String,
      enum: SupportPriority,
      default: "Low",
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: SupportStatus,
      default: "Open",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
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

/* ==========================
    SUPPORT TICKET MODEL
========================== */

const SupportTicketModel: Model<SupportTicketDocument> = mongoose.model<
  SupportTicketDocument
>("SupportTicket", supportTicketSchema);

export default SupportTicketModel;

/* ==========================
    COUNTER MODEL
========================== */

export interface CounterDocument extends Document {
  _id: string;
  sequenceValue: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, default: 0 },
});

export const CounterModel: Model<CounterDocument> = mongoose.model<
  CounterDocument
>("Counter", counterSchema);
