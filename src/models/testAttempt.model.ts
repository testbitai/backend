import mongoose, { Document, Model, Schema } from 'mongoose';
import { TestDocument } from './test.model';

export interface AttemptedQuestion {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timeTaken: number;
}

export interface TestAttemptDocument extends Document {
  user: mongoose.Types.ObjectId;
  test: TestDocument['_id'];
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  attemptedQuestions: AttemptedQuestion[];
  attemptedAt: Date;
}

const attemptedQuestionSchema = new Schema<AttemptedQuestion>(
  {
    questionId: { type: Number, required: true },
    selectedAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    timeTaken: { type: Number, required: true },
  },
  { _id: false }
);

const testAttemptSchema = new Schema<TestAttemptDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    test: { type: mongoose.Types.ObjectId, ref: 'Test', required: true },
    scorePercent: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    attemptedQuestions: [attemptedQuestionSchema],
    attemptedAt: { type: Date, default: Date.now },
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

const TestAttemptModel: Model<TestAttemptDocument> = mongoose.model<TestAttemptDocument>('TestAttempt', testAttemptSchema);

export default TestAttemptModel;
