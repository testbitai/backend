import mongoose, { Document, Model, Schema } from "mongoose";
import { TestDocument } from "./test.model";

export interface AttemptedQuestion {
  sectionIndex: number;
  questionIndex: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timeTaken: number;
  answerHistory: string[];
}

export interface SectionAnalytics {
  sectionIndex: number;
  subject: string;
  correct: number;
  total: number;
  avgTime: number;
  accuracy: number;
}

export interface SubjectAnalytics {
  subject: string;
  correct: number;
  total: number;
  avgTime: number;
  accuracy: number;
}

export interface TestAttemptDocument extends Document {
  user: mongoose.Types.ObjectId;
  test: TestDocument["_id"];
  score: number;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  totalTimeTaken: number;
  attemptedQuestions: AttemptedQuestion[];
  sectionAnalytics: SectionAnalytics[];
  subjectAnalytics: SubjectAnalytics[];
  slowestQuestions: AttemptedQuestion[];
  attemptedAt: Date;
  changedAnswersCount: number;
  changedCorrectCount: number;
}

const attemptedQuestionSchema = new Schema<AttemptedQuestion>(
  {
    sectionIndex: { type: Number, required: true },
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: String, required: true },
    answerHistory: {
      type: [String], // <-- Correct syntax!
      default: [], // safe default
    },
    isCorrect: { type: Boolean, required: true },
    timeTaken: { type: Number, required: true },
  },
  { _id: false }
);

const sectionAnalyticsSchema = new Schema<SectionAnalytics>(
  {
    sectionIndex: Number,
    subject: String,
    correct: Number,
    total: Number,
    avgTime: Number,
    accuracy: Number,
  },
  { _id: false }
);

const subjectAnalyticsSchema = new Schema<SubjectAnalytics>(
  {
    subject: String,
    correct: Number,
    total: Number,
    avgTime: Number,
    accuracy: Number,
  },
  { _id: false }
);

const testAttemptSchema = new Schema<TestAttemptDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    test: { type: mongoose.Types.ObjectId, ref: "Test", required: true },
    score: { type: Number, required: true },
    scorePercent: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    totalTimeTaken: { type: Number, required: true },
    attemptedQuestions: [attemptedQuestionSchema],
    sectionAnalytics: [sectionAnalyticsSchema],
    subjectAnalytics: [subjectAnalyticsSchema],
    slowestQuestions: [attemptedQuestionSchema],
    attemptedAt: { type: Date, default: Date.now },
    changedAnswersCount: { type: Number, default: 0 },
    changedCorrectCount: { type: Number, default: 0 },
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

const TestAttemptModel: Model<TestAttemptDocument> =
  mongoose.model<TestAttemptDocument>("TestAttempt", testAttemptSchema);

export default TestAttemptModel;
