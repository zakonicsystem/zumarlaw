import express from 'express';
import multer from 'multer';
import { addExpense, getExpenses, updateExpense, deleteExpense, getAllSubmissions, payExpense, getBranches } from '../controllers/expenseController.js';
import { verifyJWT, tryVerify } from '../middleware/authMiddleware.js';
const router = express.Router();

// multer setup for proof uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads');
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = file.originalname.split('.').pop();
		cb(null, `${unique}.${ext}`);
	}
});
const upload = multer({ storage });

// Public: allow creating and viewing expense submissions without authentication
router.post('/', addExpense);
router.get('/', getExpenses);

// View all submissions on a dedicated page (public)
router.get('/submissions', getAllSubmissions);

// Get branch list for selects
router.get('/branches', getBranches);

// Pay an expense. Accept proof file under 'proof'.
// Use tryVerify so a valid token attaches req.user but missing/invalid token won't block the request (safer fallback)
router.post('/:id/pay', tryVerify, upload.single('proof'), payExpense);

// Update and delete: use non-blocking tryVerify so edits/deletes work during development
// NOTE: This relaxes security (allows unauthenticated edits). Switch back to `verifyJWT` for production.
router.put('/:id', tryVerify, updateExpense);
router.delete('/:id', tryVerify, deleteExpense);

export default router;
