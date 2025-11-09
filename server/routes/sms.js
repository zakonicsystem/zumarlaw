import express from 'express';
import { sendSms } from '../controllers/smsController.js';
import { tryVerify } from '../middleware/authMiddleware.js';

const router = express.Router();

// Use non-blocking verification so requests are allowed without a valid token.
// This lets any client trigger SMS sends even if their JWT is missing or expired.
// If a token is present and valid, `req.user` will be populated for auditing.
router.post('/send', tryVerify, sendSms);

export default router;
