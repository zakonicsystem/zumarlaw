import express from 'express';
import multer from 'multer';
import { createRefund, getRefunds, getRefund, updateRefundStatus, deleteRefund, updateRefundDetails } from '../controllers/refundController.js';
import { tryVerify, verifyJWT, requireAdminRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// multer storage
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

// Public submission (non-blocking tryVerify so token optional)
router.post('/', tryVerify, upload.single('paymentEvidence'), createRefund);

// Update refund details (user adds refund info after admin approval)
router.put('/:id/details', tryVerify, upload.single('paymentEvidence'), updateRefundDetails);

// Read endpoints: allow optional auth so admin users can be attached but public reads are allowed
router.get('/', tryVerify, getRefunds);
router.get('/:id', tryVerify, getRefund);

// Update status (admin only - requires valid JWT token)
router.put('/:id/status', verifyJWT, requireAdminRole, updateRefundStatus);

// Delete is allowed for any user (per product request) — no authentication middleware
router.delete('/:id', deleteRefund);

export default router;
