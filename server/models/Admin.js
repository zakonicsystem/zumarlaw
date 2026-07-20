import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: { type: String, default: 'Admin' },
  lastName: { type: String, default: 'User' },
  isSuperAdmin: { type: Boolean, default: false }
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
