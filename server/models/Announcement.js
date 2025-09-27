import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema({
  heading: { type: String, required: true },
  paragraph: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Announcement', AnnouncementSchema);
