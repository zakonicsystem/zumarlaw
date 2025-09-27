import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  payrollMonth: { type: String, required: true },
  branch: { type: String, required: true },
  employee: { type: String, required: true },
  paidBy: { type: String, required: true },
  salary: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Payroll', PayrollSchema);
