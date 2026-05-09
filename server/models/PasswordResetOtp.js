import mongoose from 'mongoose';

const PasswordResetOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  accountType: { type: String, enum: ['user', 'admin', 'employee'], required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

PasswordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PasswordResetOtpSchema.index({ email: 1, accountType: 1 });

export default mongoose.model('PasswordResetOtp', PasswordResetOtpSchema);
