import express from 'express';
import * as mergeServiceController from '../controllers/mergeServiceController.js';

const router = express.Router();

// POST /mergeService/merge - merge multiple services
router.post('/merge', mergeServiceController.mergeServices);

// POST /mergeService/:id/unmerge - unmerge a service
router.post('/:id/unmerge', mergeServiceController.unmergeService);

export default router;
