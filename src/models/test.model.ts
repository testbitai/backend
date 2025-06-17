import mongoose, { Document, Model, Schema } from "mongoose";

export enum TestType {
  FULL_MOCK = "fullMock",
  CHAPTER_WISE = "chapterWise",
  DAILY_QUIZ = "dailyQuiz",
  THEMED_EVENT = "themedEvent",
}

export enum ExamType {
  JEE = "JEE",
  BITSAT = "BITSAT",
}

export enum Subject {
  PHYSICS = "Physics",
  CHEMISTRY = "Chemistry",
  MATH = "Math",
}

export interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface TestDocument extends Document {
  title: string;
  description?: string;
  examType: ExamType;
  subject: Subject;
  type: TestType;
  difficulty: "Easy" | "Medium" | "Hard";
  questions: Question[];
  createdBy: mongoose.Types.ObjectId;
  isPublished: boolean;
  isPurchased: boolean;
  duration: Number;
  createdByRole: "admin" | "tutor";
  allowedStudents: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<Question>(
  {
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: {
      type: String
    }
  },
  { _id: false }
);

const testSchema = new Schema<TestDocument>(
  {
    title: { type: String, required: true },
    description: { type: String },
    examType: { type: String, enum: Object.values(ExamType), required: true },
    subject: { type: String, enum: Object.values(Subject), required: true },
    type: { type: String, enum: Object.values(TestType), required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    questions: [questionSchema],
    duration: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: false },
    isPurchased: { type: Boolean, default: false },
    createdByRole: { type: String, enum: ["admin", "tutor"], required: true },
    allowedStudents: [{ type: mongoose.Types.ObjectId, ref: "User" }],
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

const TestModel: Model<TestDocument> = mongoose.model<TestDocument>(
  "Test",
  testSchema
);

export default TestModel;
