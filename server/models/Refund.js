import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  serviceType: { type: String },
  paymentDate: { type: Date },
  evidence: { type: String }, // path to uploaded file
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles' },
  createdByRole: { type: String }
}, { timestamps: true });

export default mongoose.model('Refund', refundSchema);
