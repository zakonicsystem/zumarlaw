import express from 'express';
import { addExpense, getExpenses, updateExpense, deleteExpense } from '../controllers/expenseController.js';
const router = express.Router();

router.post('/', addExpense);
router.get('/', getExpenses);

// Add missing update and delete routes
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
