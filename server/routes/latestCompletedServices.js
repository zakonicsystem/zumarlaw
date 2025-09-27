// Route: GET /admin/latest-completed-services?limit=4
// Returns latest completed services (from all service models)
import express from 'express';
import ServiceDetail from '../models/Service.js';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import ConvertedLead from '../models/ConvertedLead.js';
import PersonalDetail from '../models/PersonalDetail.js';

const router = express.Router();

router.get('/latest-completed-services', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    // Fetch ServiceDetail with populated personalId for name
    const service = await ServiceDetail.find({ status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(limit * 2)
      .populate('personalId', 'name')
      .lean();
    const manual = await ManualServiceSubmission.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(limit * 2).lean();
    const converted = await ConvertedLead.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(limit * 2).lean();
    // Merge and sort by completedAt
    const all = [...service, ...manual, ...converted]
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return new Date(dateB) - new Date(dateA);
      })
      .slice(0, limit);
    // Map to frontend format
    const result = all.map(s => {
      let name = 'N/A';
      // For ServiceDetail, get name from populated personalId
      if (s.personalId && typeof s.personalId === 'object' && s.personalId.name) {
        name = s.personalId.name;
      } else {
        name = s.name || s.leadName || s.clientName || s.userName || 'N/A';
      }
      // Get certificate from model (ServiceDetail, ManualServiceSubmission, ConvertedLead)
      let certificate = s.certificate || null;
      return {
        name,
        service: s.serviceType || s.serviceTitle || s.service || s.type || 'N/A',
        completedAt: s.updatedAt || s.createdAt,
        certificate,
        _id: s._id,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest completed services.' });
  }
});

export default router;
