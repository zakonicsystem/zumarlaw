import mongoose from 'mongoose';

const SmsLogSchema = new mongoose.Schema({
  to: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: String },
  user: { type: Object }, // { id, email, role } if available
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  providerResponse: { type: Object },
  error: { type: Object },
}, { timestamps: true });

const SmsLog = mongoose.models.SmsLog || mongoose.model('SmsLog', SmsLogSchema);
export default SmsLog;
