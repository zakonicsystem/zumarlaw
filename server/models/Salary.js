import mongoose from 'mongoose';

const SalarySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles', required: true },
  employeeName: { type: String, required: true },
  branch: { type: String },
  month: { type: String, required: true }, // Format: YYYY-MM
  baseSalary: { type: Number, required: true },
  present: { type: Number, default: 0 },
  absent: { type: Number, default: 0 },
  leave: { type: Number, default: 0 },
  holiday: { type: Number, default: 0 },
  sundays: { type: Number, default: 0 },
  cutDays: { type: Number, default: 0 },
  finalSalary: { type: Number, required: true },
  paymentDate: { type: Date },
  paymentMethod: { type: String },
  paidBy: { type: String },
}, { timestamps: true });

export default mongoose.model('Salary', SalarySchema);
