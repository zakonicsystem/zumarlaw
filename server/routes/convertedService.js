import express from 'express';
import multer from 'multer';
import path from 'path';
import * as convertedLeadController from '../controllers/convertedLeadController.js';
const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// Accept any file fields (dynamic)
const anyFiles = upload.any();

// POST /convertedService - create converted lead
router.post('/', anyFiles, convertedLeadController.createConvertedLead);
// GET /convertedService - get all converted leads
router.get('/', convertedLeadController.getAllConvertedLeads);
// GET /convertedService/:id - get one converted lead

// DELETE /convertedService/:id - delete a converted lead

// POST /convertedService/:id/send-invoice - send invoice to user (PDF only, links for files)
router.post('/:id/send-invoice', convertedLeadController.sendInvoice);
// Payments API for converted lead
router.get('/:id/payments', convertedLeadController.getPaymentsForConvertedLead);
router.post('/:id/payments', convertedLeadController.addPaymentToConvertedLead);
// POST /convertedService/:id/certificate - upload certificate for a converted lead
const singleCert = upload.single('certificate');
router.post('/:id/certificate', singleCert, convertedLeadController.uploadCertificate);

// DELETE /convertedService/:id - delete a converted lead
router.delete('/:id', convertedLeadController.deleteConvertedLead);
// GET /convertedService/:id - get one converted lead
router.get('/:id', convertedLeadController.getConvertedLead);
// Update assigned field for a converted lead
router.put('/:id/assign', async (req, res) => {
  try {
    const lead = await convertedLeadController.updateAssigned(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update status field for a converted lead
router.put('/:id/status', async (req, res) => {
  try {
    const lead = await convertedLeadController.updateStatus(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update progressStatus for a converted lead
router.patch('/:id/progress', async (req, res) => {
  try {
    const { progressStatus } = req.body;
    const ConvertedLead = await import('../models/ConvertedLead.js');
    const Model = ConvertedLead.default || ConvertedLead;
    const updated = await Model.findByIdAndUpdate(req.params.id, { progressStatus }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Progress status updated', progressStatus: updated.progressStatus });
  } catch (err) {
    console.error('Failed to update progress for converted lead:', err);
    res.status(500).json({ error: 'Failed to update progress status' });
  }
});

// General update endpoint for a converted lead (PATCH for partial update)
router.patch('/:id', async (req, res) => {
  try {
    const lead = await convertedLeadController.updateConvertedLead(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// PATCH a specific payment for a converted lead
router.patch('/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const lead = await convertedLeadController.editPaymentForConvertedLead(id, paymentIdx, { amount, date, method, accountNumber, personName, remarks });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead or payment not found' });
    res.json({ success: true, payments: lead.payments, pricing: lead.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE a specific payment for a converted lead
router.delete('/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const lead = await convertedLeadController.deletePaymentForConvertedLead(id, paymentIdx);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead or payment not found' });
    res.json({ success: true, payments: lead.payments, pricing: lead.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
export default router;
