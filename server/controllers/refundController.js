import Refund from '../models/Refund.js';
import path from 'path';
import fs from 'fs';

// Create a refund submission (accepts multipart upload 'evidence')
export const createRefund = async (req, res) => {
  try {
    const user = req.user || null;
    const { name, email, phone, serviceType, paymentDate, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const refund = new Refund({
      name: name?.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      serviceType: serviceType?.trim(),
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      notes: notes?.trim(),
      createdBy: user ? user.id : undefined,
      createdByRole: user ? user.role : 'Anonymous'
    });

    if (req.file) {
      refund.evidence = path.join('uploads', req.file.filename).replace(/\\/g, '/');
    }

    await refund.save();
    res.status(201).json(refund);
  } catch (err) {
    console.error('createRefund error', err);
    res.status(500).json({ error: 'Failed to create refund' });
  }
};

export const getRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({}).sort({ createdAt: -1 });
    res.json(refunds);
  } catch (err) {
    console.error('getRefunds error', err);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
};

export const getRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const refund = await Refund.findById(id);
    if (!refund) return res.status(404).json({ error: 'Refund not found' });
    res.json(refund);
  } catch (err) {
    console.error('getRefund error', err);
    res.status(500).json({ error: 'Failed to fetch refund' });
  }
};

export const deleteRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Refund.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Refund not found' });

    // If an evidence file exists, try to remove it from disk
    if (deleted.evidence) {
      try {
        const absPath = path.isAbsolute(deleted.evidence) ? deleted.evidence : path.join(process.cwd(), deleted.evidence);
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
        }
      } catch (fsErr) {
        console.warn('Failed to remove evidence file for deleted refund:', fsErr);
      }
    }

    res.json({ success: true, message: 'Refund deleted' });
  } catch (err) {
    console.error('deleteRefund error', err);
    res.status(500).json({ error: 'Failed to delete refund' });
  }
};
