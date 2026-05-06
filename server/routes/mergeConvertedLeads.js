import express from 'express';
import * as mergeConvertedLeadsController from '../controllers/mergeConvertedLeadsController.js';

const router = express.Router();

// POST /mergeConvertedLeads/merge - merge multiple converted leads
router.post('/merge', mergeConvertedLeadsController.mergeConvertedLeads);

// POST /mergeConvertedLeads/:id/unmerge - unmerge a converted lead
router.post('/:id/unmerge', mergeConvertedLeadsController.unmergeConvertedLead);

export default router;
