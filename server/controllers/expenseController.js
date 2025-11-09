
import Expense from '../models/Expense.js';
import path from 'path';

// Helper to check role allowed (case-insensitive)
const roleIn = (role, list) => {
  if (!role) return false;
  return list.map(r => r.toLowerCase()).includes(String(role).toLowerCase());
};

export const addExpense = async (req, res) => {
  try {
  // Allow anonymous submissions; record creator info if authenticated
  const user = req.user || null;

    const {
      senderName,
      senderEmail,
      senderPhone,
      senderDesignation,
      senderBranch,
      expenseCategory,
      otherDetails,
      senderBankName,
      senderAccountNumber,
      senderAccountTitle,
      paymentMethod,
      expenseTypeNumber,
      expenseSubCategory,
      remarks,
      amount,
      expenseDate,
      branch,
    } = req.body;

    // sanitize/normalize inputs
    const clean = (v) => (typeof v === 'string' ? v.trim() : v);
    const cleanAmount = Number(amount);
    if (!expenseCategory || Number.isNaN(cleanAmount) || !isFinite(cleanAmount)) return res.status(400).json({ error: 'Category and numeric amount required' });

    // Build sender object to match new schema
    const senderObj = {
      name: clean(senderName),
      email: clean(senderEmail),
      phone: clean(senderPhone),
      designation: clean(senderDesignation),
      branch: clean(senderBranch || branch),
      bankName: clean(senderBankName),
      accountNumber: clean(senderAccountNumber),
      accountTitle: clean(senderAccountTitle),
      paymentMethod: clean(paymentMethod)
    };

    const expense = new Expense({
      sender: senderObj,
      expenseCategory: clean(expenseCategory),
      otherDetails: clean(otherDetails),
      expenseTypeNumber: expenseTypeNumber ? Number(expenseTypeNumber) : undefined,
      expenseSubCategory: clean(expenseSubCategory),
      remarks: clean(remarks),
      amount: cleanAmount,
      expenseDate: expenseDate ? new Date(expenseDate) : undefined,
      // Accept branch from either `branch` or `senderBranch` (frontend uses senderBranch select)
      branch: clean(branch || senderBranch),
      // Only record a 'created' accountantDetails entry when we have an authenticated user.
      // Avoid creating an anonymous/blank accountant record for anonymous submissions.
      accountantDetails: user ? [
        {
          name: user.name || user.id,
          role: user.role || 'Unknown',
          action: 'created',
          date: new Date(),
          notes: ''
        }
      ] : [],
      createdBy: user ? user.id : undefined,
      createdByRole: user ? user.role : 'Anonymous'
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    console.error('addExpense error', err);
    res.status(500).json({ error: 'Failed to add expense' });
  }
};

export const getExpenses = async (req, res) => {
  try {
    // Public listing of expenses with optional filters: ?paid=true|false, ?branch=..., ?typeNumber=1, pagination via ?page & ?limit
    const { paid, branch, typeNumber, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (typeof paid !== 'undefined') {
      if (String(paid).toLowerCase() === 'true') filter.paid = true;
      else if (String(paid).toLowerCase() === 'false') filter.paid = false;
    }
    if (branch) filter.branch = branch;
    if (typeNumber) filter.expenseTypeNumber = Number(typeNumber);

    const p = Math.max(Number(page) || 1, 1);
    const l = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const total = await Expense.countDocuments(filter);
    let expenses = await Expense.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l);
    // normalize returned documents for backward compatibility (flat sender fields)
    expenses = expenses.map(e => {
      const obj = e.toObject ? e.toObject() : e;
      obj.senderName = obj.sender?.name || obj.senderName;
      obj.senderEmail = obj.sender?.email || obj.senderEmail;
      obj.senderPhone = obj.sender?.phone || obj.senderPhone;
      obj.senderDesignation = obj.sender?.designation || obj.senderDesignation;
      obj.senderBankName = obj.sender?.bankName || obj.senderBankName;
      obj.senderAccountNumber = obj.sender?.accountNumber || obj.senderAccountNumber;
      obj.senderAccountTitle = obj.sender?.accountTitle || obj.senderAccountTitle;
      obj.paymentMethod = obj.sender?.paymentMethod || obj.paymentMethod;
      // Ensure subcategory and otherDetails are available at top-level for client compatibility
      obj.expenseSubCategory = obj.expenseSubCategory || obj.subCategory || obj.subcategory;
      obj.otherDetails = obj.otherDetails || obj.otherDetails;
      return obj;
    });
    res.json({ total, page: p, limit: l, data: expenses });
  } catch (err) {
    console.error('getExpenses error', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// Admin/CEO only endpoint to fetch all submissions (for dedicated submissions page)
export const getAllSubmissions = async (req, res) => {
  try {
    // Public listing of submissions with same filters as getExpenses
    const { paid, branch, typeNumber, page = 1, limit = 200 } = req.query;
    const filter = {};
    if (typeof paid !== 'undefined') {
      if (String(paid).toLowerCase() === 'true') filter.paid = true;
      else if (String(paid).toLowerCase() === 'false') filter.paid = false;
    }
    if (branch) filter.branch = branch;
    if (typeNumber) filter.expenseTypeNumber = Number(typeNumber);

    const p = Math.max(Number(page) || 1, 1);
    const l = Math.min(Math.max(Number(limit) || 200, 1), 2000);
    const total = await Expense.countDocuments(filter);
    let expenses = await Expense.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l);
    expenses = expenses.map(e => {
      const obj = e.toObject ? e.toObject() : e;
      obj.senderName = obj.sender?.name || obj.senderName;
      obj.senderEmail = obj.sender?.email || obj.senderEmail;
      obj.senderPhone = obj.sender?.phone || obj.senderPhone;
      obj.senderDesignation = obj.sender?.designation || obj.senderDesignation;
      obj.senderBankName = obj.sender?.bankName || obj.senderBankName;
      obj.senderAccountNumber = obj.sender?.accountNumber || obj.senderAccountNumber;
      obj.senderAccountTitle = obj.sender?.accountTitle || obj.senderAccountTitle;
      obj.paymentMethod = obj.sender?.paymentMethod || obj.paymentMethod;
      // Ensure subcategory and otherDetails are available at top-level for client compatibility
      obj.expenseSubCategory = obj.expenseSubCategory || obj.subCategory || obj.subcategory;
      obj.otherDetails = obj.otherDetails || obj.otherDetails;
      return obj;
    });
    res.json({ total, page: p, limit: l, data: expenses });
  } catch (err) {
    console.error('getAllSubmissions error', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

export const updateExpense = async (req, res) => {
  try {
    // Authorization removed: allow update without authentication
    const { id } = req.params;
    const updates = req.body;
    const expense = await Expense.findByIdAndUpdate(id, updates, { new: true });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    console.error('updateExpense error', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    // Authorization removed: allow delete without authentication
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('deleteExpense error', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Pay an expense. Authorization removed (will record paidBy as 'Anonymous' if unauthenticated).
export const payExpense = async (req, res) => {
  try {
    const user = req.user || null;

    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (expense.paid) return res.status(400).json({ error: 'Expense already paid' });

    // If a file was uploaded, express/multer will have put it on req.file
    if (req.file) {
      // store relative path to uploads
      expense.proof = path.join('uploads', req.file.filename).replace(/\\/g, '/');
    }

    expense.paid = true;
    expense.paidAt = new Date();
    expense.paidBy = user ? { id: user.id, role: user.role } : { role: 'Anonymous' };

    // Record accounting action with structured payment info
    if (!Array.isArray(expense.accountantDetails)) expense.accountantDetails = [];
    const paymentMethod = req.body?.paymentMethod || req.body?.paymentmethod || '';
    expense.accountantDetails.push({
      name: req.body?.accountantName || (user ? (user.name || user.id) : 'Anonymous'),
      role: req.body?.accountantRole || (user ? user.role : 'Anonymous'),
      action: 'paid',
      date: new Date(),
      notes: req.body?.notes || '',
      paymentMethod,
      bankName: req.body?.bankName || '',
      accountTitle: req.body?.accountTitle || req.body?.accountTitle || '',
      accountNumber: req.body?.accountNumber || '',
      chequeNumber: req.body?.chequeNumber || ''
    });

    await expense.save();

    // Return full proof URL if present
    const host = req.get('host');
    const protocol = req.protocol;
    const proofUrl = expense.proof ? `${protocol}://${host}/${expense.proof}` : null;

    // NOTE: Accounts summary will be updated to account for paid expenses if desired.
    res.json({ success: true, expense, proofUrl });
  } catch (err) {
    console.error('payExpense error', err);
    res.status(500).json({ error: 'Failed to pay expense' });
  }
};

// Return list of branches for frontend selects. Uses distinct values from Expense collection
// If no branches are present in DB, return a sensible default list.
export const getBranches = async (req, res) => {
  try {
    const branches = await Expense.distinct('branch');
    // clean and filter out falsy/empty
    const clean = branches.map(b => (typeof b === 'string' ? b.trim() : b)).filter(Boolean);
    const defaults = ['Lahore', 'Islamabad'];
    const final = clean.length > 0 ? Array.from(new Set(clean)) : defaults;
    res.json(final);
  } catch (err) {
    console.error('getBranches error', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};