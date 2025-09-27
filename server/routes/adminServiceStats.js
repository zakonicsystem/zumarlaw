import express from 'express';
import ServiceDetail from '../models/Service.js';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import ConvertedLead from '../models/ConvertedLead.js';

const router = express.Router();

router.get('/service-status-counts', async (req, res) => {
  try {
    // Aggregate counts from all service models
    const [serviceStats, manualStats, convertedStats] = await Promise.all([
      ServiceDetail.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ManualServiceSubmission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      ConvertedLead.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    // Helper to sum counts by status (lowercase for consistency)
    const sumStatus = (arr, status) => arr.filter(e => (e._id || '').toLowerCase() === status).reduce((a, b) => a + b.count, 0);
    const completed = sumStatus(serviceStats, 'completed') + sumStatus(manualStats, 'completed') + sumStatus(convertedStats, 'completed');
    const processing = sumStatus(serviceStats, 'processing') + sumStatus(manualStats, 'processing') + sumStatus(convertedStats, 'processing');
    const pending = sumStatus(serviceStats, 'pending') + sumStatus(manualStats, 'pending') + sumStatus(convertedStats, 'pending');

    res.json({ completed, processing, pending });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service status counts.' });
  }
});

export default router;
