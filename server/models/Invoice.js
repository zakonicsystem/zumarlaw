import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceTitle: {
    type: String,
    required: true
  },
  personal_name: {
    type: String,
    required: true
  },
  personal_email: {
    type: String,
    required: true
  },
  personal_phone: {
    type: String,
    required: true
  },
  personal_cnic: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed'],
    default: 'pending'
  },
  isManualSubmission: {
    type: Boolean,
    default: false
  },
  formData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  documents: [{
    fieldName: String,
    fileUrl: String
  }],
  cnicGroups: [{
    front: String,
    back: String
  }]
}, {
  timestamps: true
});

export default mongoose.model('Invoice', invoiceSchema);
