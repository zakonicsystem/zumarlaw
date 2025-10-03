
import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
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

// Upload certificate (pending logic)
router.post('/services/:id/certificate', upload.single('certificate'), async (req, res) => {
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
router.post('/services/:id/send-invoice', async (req, res) => {
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
    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true }
    );
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
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// PATCH /admin/services/:id/status - update service status (requires authentication)
router.patch('/services/:id/status', verifyJWT, async (req, res) => {
  try {
    const { status } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
