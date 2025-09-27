import mongoose from 'mongoose';

const PersonalDetailSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  cnic: String,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('PersonalDetail', PersonalDetailSchema);
