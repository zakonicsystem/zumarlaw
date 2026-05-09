
import express from 'express';
import { verifyJWT, tryVerify } from '../middleware/authMiddleware.js';
import Service from '../models/Service.js';
import multer from 'multer';
import path from 'path';
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');// Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const isEmployeeRequest = (req) => {
  return req.user && !['admin', 'user'].includes(req.user.role);
};

const assignedToCurrentEmployeeQuery = (req, field = 'assignedTo') => {
  const values = [req.user?.id, req.user?.name, req.user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (values.length === 0) return { [field]: '__NO_ASSIGNED_EMPLOYEE__' };

  return {
    $or: values.map((value) => ({
      [field]: { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }))
  };
};
const actorName = (req) => req.user?.name || req.user?.email || req.user?.id || 'System';

// Upload certificate (pending logic)
// Allow certificate upload even if token is missing/expired; tryVerify will attach user if present
router.post('/services/:id/certificate', tryVerify, upload.single('certificate'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });

   service.certificate = req.file.filename;

    await service.save();

    res.json({ message: 'Certificate uploaded', file: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send invoice and all files to user, and make certificate visible
import nodemailer from 'nodemailer';
import fs from 'fs';
import PDFDocument from 'pdfkit';
// Allow send-invoice to proceed even if token is missing/expired; tryVerify attached earlier in middleware stack if needed
router.post('/services/:id/send-invoice', tryVerify, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('personalId');
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!service.personalId || !service.personalId.email) {
      return res.status(400).json({ error: 'User email not found. Please ensure the user has a valid email in their profile.' });
    }

    // Move pending certificate to main field
    if (service.certificatePending) {
      service.certificate = service.certificatePending;
      service.certificatePending = undefined;
      await service.save();
    }

    // Only attach certificate
    let attachments = [];
    if (service.certificate) {
      const certPath = `uploads/${service.certificate}`;
      if (fs.existsSync(certPath)) {
        attachments.push({ filename: service.certificate, path: certPath });
      }
    }

    // Send email to user (credentials from env)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: service.personalId.email,
      subject: `Your Certificate for ${service.serviceTitle}`,
      text: `Dear ${service.personalId?.name},\n\nPlease find attached your certificate for the service: ${service.serviceTitle}.\n\nThank you for choosing Zumar Law Firm.`,
      attachments
    });

    res.json({ message: 'Certificate sent to user email!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get all services (with filter options)
router.get('/admin/services', verifyJWT, async (req, res) => {
  try {
    const { isManualSubmission } = req.query;

    // Build query based on parameters
    const query = {};
    if (isManualSubmission !== undefined) {
      query.isManualSubmission = isManualSubmission === 'true';
    }
    if (isEmployeeRequest(req)) {
      Object.assign(query, assignedToCurrentEmployeeQuery(req, 'assignedTo'));
    }

    const services = await Service.find(query)
      .populate('personalId')
      .sort({ createdAt: -1 });

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});
router.patch('/services/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    const update = { $set: { assignedTo } };
    if (String(service.assignedTo || '') !== String(assignedTo || '')) {
      update.$push = { assignmentHistory: { from: service.assignedTo || '', to: assignedTo || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const updated = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Service not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// PATCH /admin/services/:id/payment-status - update payment status
router.patch('/services/:id/payment-status', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const existing = await Service.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Service not found' });
    const update = { $set: { paymentStatus } };
    if (String(existing.paymentStatus || '') !== String(paymentStatus || '')) {
      update.$push = { paymentStatusHistory: { from: existing.paymentStatus || '', to: paymentStatus || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const service = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// PATCH /admin/services/:id/status - update service status (allow tryVerify so expired tokens don't block)
router.patch('/services/:id/status', tryVerify, async (req, res) => {
  try {
    const { status } = req.body;
    const existing = await Service.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Service not found' });
    const update = { $set: { status } };
    if (String(existing.status || '') !== String(status || '')) {
      update.$push = { statusHistory: { from: existing.status || '', to: status || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const service = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
