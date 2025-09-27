
import Expense from '../models/Expense.js';

export const addExpense = async (req, res) => {
  try {
  const { type, amount, officeBoyName, officeBoyBranch, branchName, expenseWorkType, beverageType, beverageBranch } = req.body;
  if (!type || !amount) return res.status(400).json({ error: 'Type and amount required' });
  const expense = new Expense({ type, amount, officeBoyName, officeBoyBranch, branchName, expenseWorkType, beverageType, beverageBranch });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, officeBoyName, officeBoyBranch, branchName, expenseWorkType, beverageType, beverageBranch } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      id,
      { type, amount, officeBoyName, officeBoyBranch, branchName, expenseWorkType, beverageType, beverageBranch },
      { new: true }
    );
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};