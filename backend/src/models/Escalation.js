import mongoose from 'mongoose';

const escalationSchema = new mongoose.Schema({
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
  ruleTriggered: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  previousPriority: {
    type: String,
    default: 'Medium'
  },
  newPriority: {
    type: String,
    default: 'Critical'
  },
  triggeredBy: {
    type: String,
    enum: ['system', 'ai_engine', 'agent', 'supervisor'],
    default: 'system'
  },
  escalatedToSupervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export const Escalation = mongoose.model('Escalation', escalationSchema);
