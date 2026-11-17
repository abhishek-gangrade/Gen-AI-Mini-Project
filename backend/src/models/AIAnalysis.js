import mongoose from 'mongoose';

const aiAnalysisSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    unique: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  intent: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true
  },
  sentiment: {
    type: String,
    required: true
  },
  mainIssue: {
    type: String,
    required: true
  },
  keywords: [{
    type: String
  }],
  urgencyScore: {
    type: Number,
    default: 0.5
  },
  confidence: {
    type: Number,
    default: 0.8
  },
  isAgentOverridden: {
    type: Boolean,
    default: false
  },
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

export const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);
