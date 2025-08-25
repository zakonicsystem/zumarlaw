import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'Salary', 'Expense', or 'Beverage'
  amount: { type: Number, required: true },
  officeBoyName: { type: String }, // Only for Salary
  officeBoyBranch: { type: String }, // Only for Salary
  branchName: { type: String }, // Only for Expense
  expenseWorkType: { type: String }, // Only for Expense
  beverageType: { type: String }, // Only for Beverage
  beverageBranch: { type: String }, // Only for Beverage
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Expense', expenseSchema);
