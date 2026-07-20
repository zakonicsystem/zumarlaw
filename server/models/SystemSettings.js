import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: {
    type: String,
    default: 'The Zumar Law Firm system is temporarily unavailable for scheduled maintenance.',
  },
  updatedBy: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('SystemSettings', SystemSettingsSchema);
