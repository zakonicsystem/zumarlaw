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
  reviewStatus: { type: String, enum: ['pending', 'objected', 'resubmitted', 'approved'], default: 'pending' },
  objectionRemark: { type: String, maxlength: 4000 }, correctionRemark: { type: String, maxlength: 4000 },
  revision: { type: Number, default: 0 },
  reviewHistory: [{ action: { type: String, enum: ['objected', 'resubmitted', 'approved'] },
    actor: String, actorName: String, remark: String, revision: Number, at: { type: Date, default: Date.now }, snapshot: mongoose.Schema.Types.Mixed }],
  reviewStatus: { type: String, enum: ['pending', 'objected', 'resubmitted', 'approved'], default: 'pending' },
  objectionRemark: { type: String, maxlength: 4000 }, correctionRemark: { type: String, maxlength: 4000 },
  revision: { type: Number, default: 0 },
  reviewHistory: [{ action: { type: String, enum: ['objected', 'resubmitted', 'approved'] },
    actor: String, actorName: String, remark: String, revision: Number, at: { type: Date, default: Date.now }, snapshot: mongoose.Schema.Types.Mixed }],
}, { timestamps: true });
schema.index({ employee: 1, reportDate: 1, dealingService: 1 }, { unique: true });
schema.index({ employee: 1, reviewStatus: 1 });
export default mongoose.model('DailyAdReport', schema);
