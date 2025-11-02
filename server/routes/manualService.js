
// Payments API for manual service submission
import * as manualServiceController from '../controllers/manualServiceController.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import { deleteManyManualServices } from '../controllers/manualServiceController.js';

// Multer config for file uploads (store in /uploads)
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

const router = express.Router();
router.post('/:id/send-invoice', async (req, res) => {
  try {
    const submission = await ManualServiceSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (!submission.email) return res.status(400).json({ error: 'No email found for this submission' });

    // Only attach certificate
    let attachments = [];
    if (submission.certificate) {
      const certPath = path.join('uploads', submission.certificate);
      attachments.push({ filename: submission.certificate, path: certPath });
    }

    // Send email to user (Gmail, not SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: submission.email,
      subject: `Your Certificate for ${submission.serviceType || submission.service || ''}`,
      text: `Dear ${submission.name},\n\nPlease find attached your certificate for the service: ${submission.serviceType || submission.service || ''}.\n\nThank you for choosing Zumar Law Firm.`,
      attachments
    });

    res.json({ message: 'Certificate sent to user email!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Assign employee to manual service submission
router.patch('/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const updated = await ManualServiceSubmission.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Assigned employee updated', assignedTo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign employee' });
  }
});
// PATCH a specific payment for a manual service submission
router.patch('/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const submission = await manualServiceController.editPaymentForManualService(id, paymentIdx, { amount, date, method, accountNumber, personName, remarks });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission or payment not found' });
    res.json({ success: true, payments: submission.payments, pricing: submission.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE a specific payment for a manual service submission
router.delete('/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const submission = await manualServiceController.deletePaymentForManualService(id, paymentIdx);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission or payment not found' });
    res.json({ success: true, payments: submission.payments, pricing: submission.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// Update status of manual service submission
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await ManualServiceSubmission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update progressStatus of manual service submission (granular progress)
router.patch('/:id/progress', async (req, res) => {
  try {
    const { progressStatus } = req.body;
    const updated = await ManualServiceSubmission.findByIdAndUpdate(
      req.params.id,
      { progressStatus },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Progress status updated', progressStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress status' });
  }
});
// Upload certificate for a single manual service submission
router.post('/:id/certificate', upload.single('certificate'), async (req, res) => {
  try {
    const submission = await ManualServiceSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (!req.file) return res.status(400).json({ error: 'No certificate file uploaded' });
    // For future extensibility: support ?pending=true
    if (req.query.pending === 'true') {
      submission.certificatePending = req.file.filename;
    } else {
      submission.certificate = req.file.filename;
    }
    await submission.save();
    res.json({ message: 'Certificate uploaded', file: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete many manual service submissions
router.post('/deleteMany', deleteManyManualServices);

// Accept manual service submission (DirectService.jsx)
router.post('/', upload.any(), async (req, res) => {
  try {
    const {
      serviceType, name, email, cnic, phone,
      totalPayment, currentReceivingPayment, remainingAmount, paymentMethod, accountNumber, personName, paymentDate
    } = req.body;
    // Parse dynamic fields
    const fields = { ...req.body };
    delete fields.serviceType;
    delete fields.name;
    delete fields.email;
    delete fields.cnic;
    delete fields.phone;

    // Attach file paths to fields
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // For CNIC groups
        if (file.fieldname.startsWith('cnic_group_')) {
          // handled below
        } else {
          fields[file.fieldname] = file.path;
        }
      });
    }

    // Handle CNIC groups
    let cnicGroups = [];
    if (req.files && req.files.length > 0) {
      const groupMap = {};
      req.files.forEach(file => {
        if (file.fieldname.startsWith('cnic_group_')) {
          // e.g. cnic_group_0_front
          const match = file.fieldname.match(/cnic_group_(\d+)_(front|back)/);
          if (match) {
            const idx = match[1];
            const side = match[2];
            if (!groupMap[idx]) groupMap[idx] = {};
            groupMap[idx][side] = file.path;
          }
        }
      });
      cnicGroups = Object.values(groupMap);
    }

    // Build payments array: if currentReceivingPayment is provided, add as first payment
    const payments = [];
    let initialPaid = 0;
    if (currentReceivingPayment && Number(currentReceivingPayment) > 0) {
      initialPaid = Number(currentReceivingPayment);
      payments.push({
        amount: initialPaid,
        date: paymentDate || new Date(),
        method: paymentMethod || '',
        accountNumber: accountNumber || '',
        personName: personName || '',
        remarks: '',
      });
    }
    const total = totalPayment ? Number(totalPayment) : 0;
    const submission = new ManualServiceSubmission({
      serviceType,
      name,
      email,
      cnic,
      phone,
      pricing: {
        totalPayment: total,
        currentReceivingPayment: initialPaid,
        remainingAmount: Math.max(total - initialPaid, 0),
        paymentMethod,
        accountNumber,
        personName,
        paymentReceivedDate: paymentDate || undefined
      },
      payments,
      ...fields
    });
    await submission.save();
    res.status(201).json({ message: 'Submission saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});
router.get('/:id/payments', manualServiceController.getPaymentsForManualService);
router.post('/:id/payments', manualServiceController.addPaymentToManualService);
// Get all manual service submissions (DirectService.jsx)
router.get('/', async (req, res) => {
  try {
    const submissions = await ManualServiceSubmission.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;