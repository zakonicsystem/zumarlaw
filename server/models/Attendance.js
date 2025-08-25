import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles', required: true },
  email: { type: String },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  present: { type: Boolean, required: true },
  time: { type: String } // Format: HH:mm:ss
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);
