import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
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
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'Billing & Payments',
      'Account & Access',
      'Shipping & Delivery',
      'Technical Support',
      'Product & Feature',
      'General Inquiry'
    ],
    default: 'General Inquiry',
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true
  },
  status: {
    type: String,
    enum: [
      'New',
      'Open',
      'In Progress',
      'Waiting for Customer',
      'Escalated',
      'Resolved',
      'Closed'
    ],
    default: 'New',
    index: true
  },
  sentiment: {
    type: String,
    enum: ['Positive', 'Neutral', 'Negative', 'Frustrated'],
    default: 'Neutral',
    index: true
  },
  tags: [{ type: String, trim: true }],
  source: {
    type: String,
    enum: ['portal', 'email', 'api'],
    default: 'portal'
  },
  isEscalated: {
    type: Boolean,
    default: false,
    index: true
  },
  escalatedReason: {
    type: String,
    default: ''
  },
  escalatedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  slaBreached: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

ticketSchema.index({ organization: 1, status: 1 });
ticketSchema.index({ organization: 1, priority: 1 });
ticketSchema.index({ organization: 1, category: 1 });
ticketSchema.index({ organization: 1, createdAt: -1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
