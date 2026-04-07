import mongoose from 'mongoose';

const authStateSchema = new mongoose.Schema(
  {
    globalLogoutAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('AuthState', authStateSchema);