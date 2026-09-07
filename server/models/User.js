import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  password: { type: String },
  googleId: { type: String }, // for Google OAuth users
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false }, // Mark if user is admin
  services: { type: [String], default: [] }
}, {
  timestamps: true
});


userSchema.set('toJSON', { transform(doc, ret) { delete ret.password; delete ret.resetPasswordToken; delete ret.resetPasswordExpires; if (ret.login) delete ret.login.password; return ret; } });
export default mongoose.model('User', userSchema);