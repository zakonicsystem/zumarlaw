import mongoose from 'mongoose';


const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles', required: true },
  employeeName: { type: String },
  email: { type: String },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  present: { type: Boolean, default: false },
  absent: { type: Boolean, default: false },
  leave: { type: Boolean, default: false },
  holiday: { type: Boolean, default: false },
  halfDay: { type: Boolean, default: false },
  leaveRelief: { type: Boolean, default: false },
  time: { type: String }, // Format: HH:mm:ss
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);
