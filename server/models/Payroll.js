import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  payrollMonth: { type: String, required: true },
  branch: { type: String, required: true },
  employee: { type: String, required: true },
  paidBy: { type: String, required: false },
  salary: { type: Number, required: true },
  paymentDate: { type: Date, required: false },
  paymentMethod: { type: String, required: false },
  // New fields to support payment recording from UI
  status: { type: String, enum: ['Paid', 'Pending', 'Unpaid'], default: 'Unpaid' },
  accountNumber: { type: String, required: false },
  chequeNumber: { type: String, required: false },
}, { timestamps: true });

export default mongoose.model('Payroll', PayrollSchema);
