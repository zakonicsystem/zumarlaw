
// Payments API for manual service submission
import * as manualServiceController from '../controllers/manualServiceController.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import Service from '../models/Service.js';
import ConvertedLead from '../models/ConvertedLead.js';
import { deleteManyManualServices } from '../controllers/manualServiceController.js';


// Multer config for file uploads (store in /uploads)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

const router = express.Router();

// Debug endpoint to verify merge route is loaded
router.get('/debug/merge-route-test', (req, res) => {
  res.json({ message: 'Merge route is loaded and accessible' });
});

// Merge multiple services into one (MUST come before parameterized :id routes)
router.post('/merge', async (req, res) => {
  console.log('✅ MERGE ROUTE CALLED - /api/manualService/merge');
  console.log('Request body:', req.body);
  try {
    const { serviceIds, serviceTypes = ['manual'], isMixed = false, allServices = [] } = req.body;
    console.log('Service IDs to merge:', serviceIds);
    console.log('Service types:', serviceTypes);
    console.log('Mixed types:', isMixed);

    if (!Array.isArray(serviceIds) || serviceIds.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 service IDs required to merge' });
    }

    // Fetch services from appropriate models
    let services = [];
    
    if (isMixed || serviceTypes.includes('converted') || serviceTypes.includes('processing')) {
      // Handle mixed or different types by fetching from all relevant models
      console.log('Fetching services from multiple models due to mixed types...');
      
      const [manualServices, processingServices, convertedServices] = await Promise.all([
        ManualServiceSubmission.find({ _id: { $in: serviceIds } }),
        Service.find({ _id: { $in: serviceIds } }),
        ConvertedLead.find({ _id: { $in: serviceIds } })
      ]);
      
      services = [...manualServices, ...processingServices, ...convertedServices];
      console.log(`Found ${services.length} services (Manual: ${manualServices.length}, Processing: ${processingServices.length}, Converted: ${convertedServices.length})`);
    } else {
      // All manual services
      console.log('Fetching services from ManualServiceSubmission...');
      services = await ManualServiceSubmission.find({ _id: { $in: serviceIds } });
      console.log(`Found ${services.length} services`);
    }

    console.log(`Found ${services.length} services out of ${serviceIds.length} requested`);
    console.log('Services found:', services.map(s => ({ _id: s._id, name: s.name || s.applicantName, cnic: s.cnic })));

    if (services.length !== serviceIds.length) {
      console.warn('❌ NOT ALL SERVICES FOUND!');
      return res.status(404).json({ success: false, message: `One or more services not found. Found ${services.length} out of ${serviceIds.length}` });
    }

    // Use first service as primary/template - find which is manual type if possible
    let primary = services[0];
    let primaryIndex = 0;
    
    // Prefer manual service as primary if available
    for (let i = 0; i < services.length; i++) {
      if (services[i].constructor.modelName === 'ManualServiceSubmission') {
        primary = services[i];
        primaryIndex = i;
        break;
      }
    }
    
    const secondaryIds = serviceIds.filter(id => id.toString() !== primary._id.toString());

    // Backup secondary services data before marking as merged
    const secondaryBackup = services.filter(s => s._id.toString() !== primary._id.toString()).map((service) => ({
      _id: service._id.toString(),
      data: service.toObject(),
      model: service.constructor.modelName
    }));

    // Combine data from all services
    const mergedData = {
      name: primary.name || primary.applicantName,
      email: primary.email,
      cnic: primary.cnic,
      phone: primary.phone,
      serviceType: primary.serviceType || primary.service,
      primaryName: primary.name || primary.applicantName,
      mergedIds: serviceIds, // Store all merged service IDs
      mergedCount: serviceIds.length,
      mergedAt: new Date(),
      secondaryBackup: secondaryBackup, // Store backup to restore on unmerge
      mergedServiceModels: Array.from(new Set(services.map(s => s.constructor.modelName))), // Track which models were merged

      // Combine pricing - sum totals and received amounts
      pricing: {
        totalPayment: services.reduce((sum, s) => sum + (Number(s.pricing?.totalPayment) || 0), 0),
        currentReceivingPayment: services.reduce((sum, s) => sum + (Number(s.pricing?.currentReceivingPayment) || 0), 0),
        remainingAmount: services.reduce((sum, s) => sum + (Number(s.pricing?.remainingAmount) || 0), 0),
        paymentMethod: primary.pricing?.paymentMethod || '',
        accountNumber: primary.pricing?.accountNumber || '',
        personName: primary.pricing?.personName || '',
        paymentReceivedDate: primary.pricing?.paymentReceivedDate || undefined,
      },

      // Combine all payments
      payments: services.flatMap(s => s.payments || []),

      // Merge fields (combine from all services, with secondary data marked)
      fields: {
        ...primary.fields,
        ...services.slice(1).reduce((acc, service, idx) => {
          Object.keys(service.fields || {}).forEach(key => {
            if (!acc[`secondary_service_${idx + 1}_${key}`]) {
              acc[`secondary_service_${idx + 1}_${key}`] = service.fields[key];
            }
          });
          return acc;
        }, {})
      },

      // Combine CNIC groups from all services
      cnicGroups: services.flatMap(s => s.cnicGroups || []),

      // Keep primary certificate
      certificate: primary.certificate || '',

      assignedTo: primary.assignedTo || '',
      status: primary.status || 'pending',
      progressStatus: primary.progressStatus || '',
    };

    // Update primary service with merged data - find primary in ManualServiceSubmission
    // If primary is not manual, create a new manual service for the merge
    let updatedMerged;
    
    if (primary.constructor.modelName === 'ManualServiceSubmission') {
      updatedMerged = await ManualServiceSubmission.findByIdAndUpdate(
        primary._id,
        mergedData,
        { new: true }
      );
    } else {
      // Create new manual service for merged data
      const newMergedService = new ManualServiceSubmission(mergedData);
      updatedMerged = await newMergedService.save();
      console.log('Created new manual service for merge:', updatedMerged._id);
    }

    // Mark secondary services as merged in their respective models
    if (secondaryIds.length > 0) {
      const updateData = {
        isMergedInto: updatedMerged._id,
        mergedIntoSet: serviceIds,
        // Don't override status - keep original status
      };

      // Update in all models where these services might exist
      await Promise.all([
        ManualServiceSubmission.updateMany(
          { _id: { $in: secondaryIds } },
          { $set: updateData }
        ),
        Service.updateMany(
          { _id: { $in: secondaryIds } },
          { $set: updateData }
        ),
        ConvertedLead.updateMany(
          { _id: { $in: secondaryIds } },
          { $set: updateData }
        )
      ]);
      
      console.log(`Marked ${secondaryIds.length} services as merged`);
    }

    res.json({
      success: true,
      message: `Successfully merged ${serviceIds.length} services`,
      mergedService: updatedMerged
    });

  } catch (err) {
    console.error('❌ Merge error:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ success: false, message: err.message || 'Failed to merge services' });
  }
});

// Unmerge a merged service - restore original services
router.post('/:id/unmerge', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the merged service
    const mergedService = await ManualServiceSubmission.findById(id);

    if (!mergedService) {
      return res.status(404).json({ success: false, message: 'Merged service not found' });
    }

    if (!Array.isArray(mergedService.mergedIds) || mergedService.mergedIds.length < 2) {
      return res.status(400).json({ success: false, message: 'This is not a merged service or cannot be unmerged' });
    }

    const mergedIds = mergedService.mergedIds;
    const primaryId = mergedIds[0];
    const secondaryIds = mergedIds.slice(1);
    const hasMultipleModels = mergedService.mergedServiceModels && mergedService.mergedServiceModels.length > 1;

    // Restore secondary services from backup
    if (Array.isArray(mergedService.secondaryBackup) && mergedService.secondaryBackup.length > 0) {
      for (const backup of mergedService.secondaryBackup) {
        const updateData = {
          $unset: {
            isMergedInto: 1,
            mergedIntoSet: 1
          },
          $set: {
            status: backup.data.status || 'pending'  // Restore original status from backup
          }
        };

        // Restore to correct model
        if (hasMultipleModels && backup.model) {
          if (backup.model === 'ManualServiceSubmission') {
            await ManualServiceSubmission.findByIdAndUpdate(backup._id, updateData);
          } else if (backup.model === 'Service') {
            await Service.findByIdAndUpdate(backup._id, updateData);
          } else if (backup.model === 'ConvertedLead') {
            await ConvertedLead.findByIdAndUpdate(backup._id, updateData);
          }
        } else {
          // Default to ManualServiceSubmission
          await ManualServiceSubmission.findByIdAndUpdate(backup._id, updateData);
        }
      }
    }

    // Remove merge markers from primary service
    await ManualServiceSubmission.findByIdAndUpdate(
      primaryId,
      {
        $unset: {
          mergedIds: 1,
          mergedCount: 1,
          mergedAt: 1,
          primaryName: 1,
          secondaryBackup: 1,
          mergedServiceModels: 1
        }
      }
    );

    // Also clear merge markers from all models where secondary services might be
    if (hasMultipleModels && secondaryIds.length > 0) {
      const clearMergeData = {
        $unset: {
          isMergedInto: 1,
          mergedIntoSet: 1
        }
      };
      
      await Promise.all([
        Service.updateMany(
          { _id: { $in: secondaryIds } },
          clearMergeData
        ),
        ConvertedLead.updateMany(
          { _id: { $in: secondaryIds } },
          clearMergeData
        )
      ]);
    }

    res.json({
      success: true,
      message: 'Service unmerged successfully. Merged services restored to individual status.',
    });

  } catch (err) {
    console.error('Unmerge error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to unmerge service' });
  }
});

router.post('/:id/send-invoice', async (req, res) => {
  try {
    const submission = await ManualServiceSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (!submission.email) return res.status(400).json({ error: 'No email found for this submission' });

    // Only attach certificate
    let attachments = [];
    if (submission.certificate) {
      const uploadsPath = path.join(process.cwd(), 'uploads');
      const certPath = path.join(uploadsPath, submission.certificate);
      if (fs.existsSync(certPath)) {
        attachments.push({ filename: submission.certificate, path: certPath });
      } else {
        console.warn(`Certificate file not found for submission ${req.params.id}: ${certPath}`);
      }
    }

    // Send email to user (Gmail, not SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: submission.email,
        subject: `Your Certificate for ${submission.serviceType || submission.service || ''}`,
        text: `Dear ${submission.name},\n\nPlease find attached your certificate for the service: ${submission.serviceType || submission.service || ''}.\n\nThank you for choosing Zumar Law Firm.`,
        attachments
      });
      res.json({ message: 'Certificate sent to user email!' });
    } catch (mailErr) {
      console.error('Failed to send certificate email for manual service:', mailErr);
      return res.status(500).json({ error: 'Failed to send certificate email' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Assign employee to manual service submission
router.patch('/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const updated = await ManualServiceSubmission.findByIdAndUpdate(
      req.params.id,
      { assignedTo },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Assigned employee updated', assignedTo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign employee' });
  }
});

// PATCH to update general fields including pricing.totalPayment
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await manualServiceController.updateManualService(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH a specific payment for a manual service submission
router.patch('/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const submission = await manualServiceController.editPaymentForManualService(id, paymentIdx, { amount, date, method, accountNumber, personName, remarks });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission or payment not found' });
    res.json({ success: true, payments: submission.payments, pricing: submission.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE a specific payment for a manual service submission
router.delete('/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const submission = await manualServiceController.deletePaymentForManualService(id, paymentIdx);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission or payment not found' });
    res.json({ success: true, payments: submission.payments, pricing: submission.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// Update status of manual service submission
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await ManualServiceSubmission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    
    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update progressStatus of manual service submission (granular progress)
router.patch('/:id/progress', async (req, res) => {
  try {
    const { progressStatus } = req.body;
    const updated = await ManualServiceSubmission.findByIdAndUpdate(
      req.params.id,
      { progressStatus },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Progress status updated', progressStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress status' });
  }
});
// Upload certificate for a single manual service submission
router.post('/:id/certificate', upload.single('certificate'), async (req, res) => {
  try {
    const submission = await ManualServiceSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (!req.file) return res.status(400).json({ error: 'No certificate file uploaded' });
    // For future extensibility: support ?pending=true
    if (req.query.pending === 'true') {
      submission.certificatePending = req.file.filename;
    } else {
      submission.certificate = req.file.filename;
    }
    await submission.save();
    
    res.json({ message: 'Certificate uploaded', file: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete many manual service submissions
router.post('/deleteMany', deleteManyManualServices);

// Accept manual service submission (DirectService.jsx)
router.post('/', upload.any(), async (req, res) => {
  try {
    const {
      serviceType, name, email, cnic, phone,
      totalPayment, currentReceivingPayment, remainingAmount, paymentMethod, accountNumber, personName, paymentDate
    } = req.body;
    // Parse dynamic fields
    const fields = { ...req.body };
    delete fields.serviceType;
    delete fields.name;
    delete fields.email;
    delete fields.cnic;
    delete fields.phone;

    // Attach file paths to fields
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // For CNIC groups
        if (file.fieldname.startsWith('cnic_group_')) {
          // handled below
        } else {
          fields[file.fieldname] = file.path;
        }
      });
    }

    // Handle CNIC groups
    let cnicGroups = [];
    if (req.files && req.files.length > 0) {
      const groupMap = {};
      req.files.forEach(file => {
        if (file.fieldname.startsWith('cnic_group_')) {
          // e.g. cnic_group_0_front
          const match = file.fieldname.match(/cnic_group_(\d+)_(front|back)/);
          if (match) {
            const idx = match[1];
            const side = match[2];
            if (!groupMap[idx]) groupMap[idx] = {};
            groupMap[idx][side] = file.path;
          }
        }
      });
      cnicGroups = Object.values(groupMap);
    }

    // Build payments array: if currentReceivingPayment is provided, add as first payment
    const payments = [];
    let initialPaid = 0;
    if (currentReceivingPayment && Number(currentReceivingPayment) > 0) {
      initialPaid = Number(currentReceivingPayment);
      payments.push({
        amount: initialPaid,
        date: paymentDate || new Date(),
        method: paymentMethod || '',
        accountNumber: accountNumber || '',
        personName: personName || '',
        remarks: '',
      });
    }
    const total = totalPayment ? Number(totalPayment) : 0;
    const submission = new ManualServiceSubmission({
      serviceType,
      name,
      email,
      cnic,
      phone,
      pricing: {
        totalPayment: total,
        currentReceivingPayment: initialPaid,
        remainingAmount: Math.max(total - initialPaid, 0),
        paymentMethod,
        accountNumber,
        personName,
        paymentReceivedDate: paymentDate || undefined
      },
      payments,
      ...fields
    });
    await submission.save();
    res.status(201).json({ message: 'Submission saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});
router.get('/:id/payments', manualServiceController.getPaymentsForManualService);
router.post('/:id/payments', manualServiceController.addPaymentToManualService);
// Get all manual service submissions (DirectService.jsx)
router.get('/', async (req, res) => {
  try {
    const submissions = await ManualServiceSubmission.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;