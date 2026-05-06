import express from 'express';
import * as challanController from '../controllers/challanController.js';

const router = express.Router();

// Create a new challan
router.post('/', challanController.createChallan);

// Get all challans (with optional filters)
router.get('/', challanController.getAllChallans);

// Get challan by service
router.get('/:serviceSource/:serviceId', challanController.getChallanByService);

// Update challan
router.patch('/:id', challanController.updateChallan);

// Delete challan
router.delete('/:id', challanController.deleteChallan);

// Add/Update fee (shortcut endpoint)
router.post('/add-fee', challanController.addFee);

// Get fees summary
router.get('/summary/fees', challanController.getFeesSummary);

export default router;
