import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  slaConfig: {
    lowHours: { type: Number, default: 48 },
    mediumHours: { type: Number, default: 24 },
    highHours: { type: Number, default: 8 },
    criticalHours: { type: Number, default: 2 }
  },
  categories: {
    type: [String],
    default: [
      'Billing & Payments',
      'Account & Access',
      'Shipping & Delivery',
      'Technical Support',
      'Product & Feature',
      'General Inquiry'
    ]
  },
  aiSettings: {
    autoClassify: { type: Boolean, default: true },
    autoDraftResponse: { type: Boolean, default: true },
    defaultTone: { type: String, default: 'Professional' },
    minConfidenceThreshold: { type: Number, default: 0.25 }
  }
}, { timestamps: true });

export const Organization = mongoose.model('Organization', organizationSchema);
