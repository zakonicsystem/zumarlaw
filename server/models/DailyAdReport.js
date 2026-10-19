import mongoose from 'mongoose';
export const metrics = ['totalLeads', 'fakeLeads', 'noResponseLeads', 'interestedLeads', 'matureLeads', 'previousMatureLeads', 'followUpLeads', 'convertedNew', 'convertedOld'];
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  employeeName: String, designation: String, employeePhone: String,
  reportDate: { type: String, required: true }, dealingService: { type: String, required: true },
  ...Object.fromEntries(metrics.map(key => [key, { type: Number, min: 0, default: 0 }])),
  fakeComments: { type: String, maxlength: 4000 }, followUpComments: { type: String, maxlength: 4000 },
  convertedClientName: { type: String, maxlength: 2000 }, employeeSignature: { type: String, required: true, maxlength: 160 },
  supervisorName: String, supervisorSignature: String, remark: { type: String, maxlength: 4000 }, reviewedAt: Date,
}, { timestamps: true });
schema.index({ employee: 1, reportDate: 1, dealingService: 1 }, { unique: true });
export default mongoose.model('DailyAdReport', schema);
