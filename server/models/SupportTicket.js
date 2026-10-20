import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reference: { type: String, required: true, unique: true },
  name: String, cnic: String, email: String, phone: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, index: true }, createdByRole: String, createdByName: String,
  serviceName: String,
  attachments: [{ filename: String, originalName: String, mimetype: String, size: Number }],
  deletedAt: Date, deletedBy: String,
  subject: { type: String, required: true, maxlength: 180 },
  category: { type: String, enum: ['Employee Behaviour', 'Service Related Problem', 'Refund Service Fee', 'Other'], default: 'Other' },
  description: { type: String, required: true, maxlength: 6000 },
  status: { type: String, enum: ['pending', 'under_review', 'resolved', 'completed', 'open', 'in_progress'], default: 'pending' },
  resolution: { type: String, maxlength: 6000 }, resolvedAt: Date, resolvedBy: String,
}, { timestamps: true });
export default mongoose.model('SupportTicket', schema);
