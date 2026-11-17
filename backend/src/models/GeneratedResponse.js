import mongoose from 'mongoose';

const generatedResponseSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  suggestedText: {
    type: String,
    required: true
  },
  tone: {
    type: String,
    enum: ['Professional', 'Friendly', 'Concise', 'Detailed'],
    default: 'Professional'
  },
  retrievedSources: [{
    docId: String,
    docTitle: String,
    chunkIndex: Number,
    snippet: String,
    score: Number
  }],
  confidenceScore: {
    type: Number,
    default: 0.0
  },
  sufficientContext: {
    type: Boolean,
    default: true
  },
  modelProvider: {
    type: String,
    default: 'ResolveAI Grounded Engine'
  },
  status: {
    type: String,
    enum: ['draft', 'edited', 'approved', 'rejected'],
    default: 'draft',
    index: true
  },
  approvedText: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export const GeneratedResponse = mongoose.model('GeneratedResponse', generatedResponseSchema);
