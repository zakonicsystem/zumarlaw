import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  totalPrice: { type: Number, required: true },
  advancePayment: { type: Number, required: true },
  remainingPayment: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Account', AccountSchema);
