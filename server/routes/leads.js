import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

// Bulk import leads
router.post('/import', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: 'No leads provided' });
        }
        await Lead.insertMany(leads);
        res.status(201).json({ message: 'Leads imported successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to import leads', error: err.message });
    }
});

// Get all leads
router.get('/', async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch leads', error: err.message });
    }
});

// (Optional) Add single lead
router.post('/', async (req, res) => {
    try {
        const lead = new Lead(req.body);
        await lead.save();
        res.status(201).json(lead);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add lead', error: err.message });
    }
});


// Update lead status by ID
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const lead = await Lead.findByIdAndUpdate(id, { status }, { new: true });
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json({ message: 'Status updated', lead });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update status', error: err.message });
    }
});
// Delete lead by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findByIdAndDelete(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json({ message: 'Lead deleted', lead });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete lead', error: err.message });
    }
});

// Get single lead by ID (view)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json(lead);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch lead', error: err.message });
    }
});

// Update lead by ID (edit)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body;
        const lead = await Lead.findByIdAndUpdate(id, update, { new: true });
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json({ message: 'Lead updated', lead });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update lead', error: err.message });
    }
});




export default router;
