import express from 'express';
import Lead from '../models/Lead.js';
import { tryVerify } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(tryVerify);
const NEW_LEAD_FOLLOW_UP_DAYS = 2;
const NEW_STATUSES = ['New', 'New Lead'];

const normalizeLead = (lead = {}) => ({
    ...lead,
    status: lead.status || 'New',
    statusChangedAt: lead.statusChangedAt || lead.createdAt || new Date()
});

const moveOldNewLeadsToFollowUp = async () => {
    const cutoff = new Date(Date.now() - NEW_LEAD_FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
    await Lead.updateMany(
        {
            status: { $in: NEW_STATUSES },
            createdAt: { $lte: cutoff }
        },
        {
            $set: {
                status: 'Follow-up',
                statusChangedAt: new Date(),
                autoFollowUpAt: new Date()
            }
        }
    );
};

const isEmployeeRequest = (req) => {
    const role = String(req.user?.role || '').toLowerCase();
    return !!req.user && role !== 'admin' && role !== 'user';
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const employeeAssignedQuery = (req) => {
    if (!isEmployeeRequest(req)) return {};

    const employeeValues = [
        req.user.id?.toString(),
        req.user.name,
        req.user.email
    ].filter(Boolean);

    return {
        $or: employeeValues.map((value) => ({
            assigned: { $regex: `^${escapeRegex(value)}$`, $options: 'i' }
        }))
    };
};

const employeeCanAccessLead = (req, lead) => {
    if (!isEmployeeRequest(req)) return true;
    const assigned = String(lead?.assigned || '').trim().toLowerCase();
    const employeeValues = [
        req.user.id?.toString(),
        req.user.name,
        req.user.email
    ].filter(Boolean).map((value) => String(value).trim().toLowerCase());

    return employeeValues.includes(assigned);
};

const sendForbiddenLead = (res) => res.status(403).json({ message: 'You can only access leads assigned to you' });

// Bulk import leads
router.post('/import', async (req, res) => {
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: 'No leads provided' });
        }
        await Lead.insertMany(leads.map(normalizeLead));
        res.status(201).json({ message: 'Leads imported successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to import leads', error: err.message });
    }
});

// Get all leads
router.get('/', async (req, res) => {
    try {
        await moveOldNewLeadsToFollowUp();
        const leads = await Lead.find(employeeAssignedQuery(req)).sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch leads', error: err.message });
    }
});

// (Optional) Add single lead
router.post('/', async (req, res) => {
    try {
        const lead = new Lead(normalizeLead(req.body));
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
        const statusChangedAt = new Date();
        const update = { status, statusChangedAt };
        if (status === 'Refusal') update.refusedAt = statusChangedAt;
        const existing = await Lead.findById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (!employeeCanAccessLead(req, existing)) {
            return sendForbiddenLead(res);
        }

        const lead = await Lead.findByIdAndUpdate(id, update, { new: true });
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
        const existing = await Lead.findById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (!employeeCanAccessLead(req, existing)) {
            return sendForbiddenLead(res);
        }

        const lead = await Lead.findByIdAndDelete(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        res.json({ message: 'Lead deleted', lead });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete lead', error: err.message });
    }
});

// Add employee follow-up report for a lead
router.post('/:id/followups', async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeName, customerReport, nextFollowUpAt } = req.body;

        if (!customerReport || !String(customerReport).trim()) {
            return res.status(400).json({ message: 'Customer report is required' });
        }

        const followUp = {
            employeeName: employeeName || 'Employee',
            customerReport: String(customerReport).trim(),
            nextFollowUpAt: nextFollowUpAt || undefined,
            createdAt: new Date()
        };

        const existing = await Lead.findById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (!employeeCanAccessLead(req, existing)) {
            return sendForbiddenLead(res);
        }

        const lead = await Lead.findByIdAndUpdate(
            id,
            {
                $set: { status: 'Follow-up', statusChangedAt: new Date() },
                $push: { followUps: followUp }
            },
            { new: true }
        );

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.status(201).json({ message: 'Follow-up report added', lead });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add follow-up report', error: err.message });
    }
});

// Get single lead by ID (view)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await moveOldNewLeadsToFollowUp();
        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (!employeeCanAccessLead(req, lead)) {
            return sendForbiddenLead(res);
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
        const existing = await Lead.findById(id);
        if (!existing) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        if (!employeeCanAccessLead(req, existing)) {
            return sendForbiddenLead(res);
        }

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
