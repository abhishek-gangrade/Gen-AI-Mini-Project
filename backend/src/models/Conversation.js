import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
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
  summary: {
    type: String,
    default: ''
  },
  originalProblem: {
    type: String,
    default: ''
  },
  troubleshootingAttempted: [{
    type: String
  }],
  unresolvedQuestions: [{
    type: String
  }],
  promisesMade: [{
    type: String
  }],
  suggestedNextAction: {
    type: String,
    default: ''
  },
  lastSummarizedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);
