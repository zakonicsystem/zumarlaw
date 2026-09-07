import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: { type: String, default: 'Admin' },
  lastName: { type: String, default: 'User' },
  isSuperAdmin: { type: Boolean, default: false }
});

const Admin = mongoose.model('Admin', adminSchema);

adminSchema.set('toJSON', { transform(doc, ret) { delete ret.password; delete ret.resetPasswordToken; delete ret.resetPasswordExpires; if (ret.login) delete ret.login.password; return ret; } });
export default Admin;
