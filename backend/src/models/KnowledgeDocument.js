import mongoose from 'mongoose';

const knowledgeDocumentSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'txt', 'docx', 'md'],
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'indexed', 'failed'],
    default: 'pending',
    index: true
  },
  errorMessage: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General Policy'
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export const KnowledgeDocument = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
