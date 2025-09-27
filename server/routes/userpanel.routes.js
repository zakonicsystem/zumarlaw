import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import ServiceDetail from '../models/Service.js';
import PersonalDetail from '../models/PersonalDetail.js';

const router = express.Router();

// GET /userpanel/services - Fetch services for logged-in user
router.get('/services', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const services = await ServiceDetail.find({ userId })
      .populate('personalId') // to get name, email, etc.
      .sort({ createdAt: -1 }); // optional: newest first

    res.json(services);
  } catch (error) {
    console.error('Error fetching user services:', error);
    res.status(500).json({ message: 'Failed to fetch user services' });
  }
});

export default router;
