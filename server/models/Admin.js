import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: { type: String, default: 'Admin' },
  lastName: { type: String, default: 'User' },
  lastLogoutAt: { type: Date, default: null } // Track when admin last logged out from all devices
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
