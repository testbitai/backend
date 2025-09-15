import mongoose, { Document, Schema } from 'mongoose';
import { DetailedAIAnalysis } from '../services/aiAnalysis.service';

export interface AIAnalysisCacheDocument extends Document {
  testAttemptId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  analysis: DetailedAIAnalysis;
  createdAt: Date;
}

const aiAnalysisCacheSchema = new Schema<AIAnalysisCacheDocument>({
  testAttemptId: {
    type: Schema.Types.ObjectId,
    ref: 'TestAttempt',
    required: true,
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  analysis: {
    type: Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<AIAnalysisCacheDocument>('AIAnalysisCache', aiAnalysisCacheSchema);
