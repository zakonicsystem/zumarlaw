import mongoose from 'mongoose';

const ServiceMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceDetail', required: false }, // Correct model name for service reference
  type: { type: String, enum: ['alert', 'update'], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ServiceMessage', ServiceMessageSchema);