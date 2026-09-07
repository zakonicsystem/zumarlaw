import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles' },
  payrollKey: String,
  calculationVersion: Number,
  salaryBreakdown: mongoose.Schema.Types.Mixed,
  calculationSource: { type: String, enum: ['attendance','manual'] },
  auditHistory: [{ actorId: String, actorName: String, action: String, before: mongoose.Schema.Types.Mixed, after: mongoose.Schema.Types.Mixed, reason: String, at: Date }],
  payrollMonth: { type: String, required: true },
  branch: { type: String, required: true },
  employee: { type: String, required: true },
  paidBy: { type: String, required: false },
  salary: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: false },
  paymentMethod: { type: String, required: false },
  // New fields to support payment recording from UI
  status: { type: String, enum: ['Paid', 'Pending', 'Unpaid', 'Voided'], default: 'Unpaid' },
  accountNumber: { type: String, required: false },
  chequeNumber: { type: String, required: false },
}, { timestamps: true });

PayrollSchema.index({ payrollKey: 1 }, { unique: true, partialFilterExpression: { payrollKey: { $type: 'string' } } });

export default mongoose.model('Payroll', PayrollSchema);
