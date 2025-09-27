import express from 'express';
import Announcement from '../models/Announcement.js';
const router = express.Router();

// Get all announcements
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Add new announcement
router.post('/', async (req, res) => {
  try {
    const { heading, paragraph } = req.body;
    const announcement = new Announcement({ heading, paragraph });
    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add announcement' });
  }
});

// Edit announcement
router.put('/:id', async (req, res) => {
  try {
    const { heading, paragraph } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { heading, paragraph },
      { new: true }
    );
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
