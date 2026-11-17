import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
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
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['admin', 'supervisor', 'agent', 'customer', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  }],
  isInternalNote: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const Message = mongoose.model('Message', messageSchema);
