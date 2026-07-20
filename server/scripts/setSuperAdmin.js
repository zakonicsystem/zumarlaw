import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

dotenv.config();

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run set-super-admin -- admin@example.com');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not configured');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await Admin.findOneAndUpdate(
    { email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    { $set: { isSuperAdmin: true } },
    { new: true }
  );
  if (!admin) {
    console.error('Admin account not found');
    process.exitCode = 1;
  } else {
    console.log(`Super Admin enabled for ${admin.email}`);
  }
} finally {
  await mongoose.disconnect();
}
