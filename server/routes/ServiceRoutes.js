import express from 'express';
import multer from 'multer';
import path from 'path';
import PersonalDetail from '../models/PersonalDetail.js';
import ServiceDetail from '../models/Service.js';
import { verifyJWT, tryVerify } from '../middleware/authMiddleware.js';
import { sendInvoiceAndCertificate } from '../controllers/serviceController.js';
import {
  getConfiguredServicePrice,
  getServicePriceSnapshot,
} from '../data/servicePrices.js';
import { notifyPaymentReceived } from '../utils/paymentNotification.js';

const router = express.Router();

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const isEmployeeRequest = (req) => {
  return req.user && !['admin', 'user'].includes(req.user.role);
};

const isRestrictedEmployeeRequest = (req) => (
  isEmployeeRequest(req) && req.user?.canViewAllLeadsAndServices !== true
);

const assignedToCurrentEmployeeQuery = (req, field = 'assignedTo') => {
  const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactValues = [req.user?.id, req.user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const employeeName = req.user?.name ? String(req.user.name).trim() : '';

  if (exactValues.length === 0 && !employeeName) return { [field]: '__NO_ASSIGNED_EMPLOYEE__' };

  return {
    $or: [
      ...exactValues.map((value) => ({
        [field]: { $regex: `^${escapeRegex(value)}$`, $options: 'i' }
      })),
      ...(employeeName
        ? [{ [field]: { $regex: `^${escapeRegex(employeeName)}(\\s|$)`, $options: 'i' } }]
        : [])
    ]
  };
};
const actorName = (req) => req.user?.name || req.user?.email || req.user?.id || 'System';


// 🟢 POST: Save Invoice Details + Files
router.post('/invoices', verifyJWT, upload.any(), async (req, res) => {
  try {
    const userId = req.user.id; // ✅ Set in verifyJWT middleware

    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const rawFields = {};
    const files = {};

    // 🔽 Handle uploaded files
    req.files.forEach((file) => {
      if (!files[file.fieldname]) files[file.fieldname] = [];
      files[file.fieldname].push(file.filename);
    });

    // 🔽 Parse form fields
    for (const key in req.body) {
      try {
        rawFields[key] = JSON.parse(req.body[key]);
      } catch {
        rawFields[key] = req.body[key];
      }
    }

    // 🔽 Extract personal + service info
    const {
      personal_name,
      personal_email,
      personal_phone,
      personal_cnic,
      serviceTitle,
      ...dynamicFields
    } = rawFields;

    // 🔽 Save personal details
    const personal = new PersonalDetail({
      name: personal_name,
      email: personal_email,
      phone: personal_phone,
      cnic: personal_cnic,
    });
    await personal.save();

    // 🔽 Merge uploaded files into dynamicFields
    for (const key in files) {
      dynamicFields[key] = files[key].length === 1 ? files[key][0] : files[key];
    }

    // 🔽 Save main service entry

    // For direct service (AddServiceDetails.jsx), set isManualSubmission: false
    const configuredPrice = getConfiguredServicePrice(serviceTitle);
    const service = new ServiceDetail({
      serviceTitle,
      formFields: dynamicFields,
      personalId: personal._id,
      userId: userId, // ✅ FIXED FIELD NAME
      status: 'pending',
      paymentStatus: 'pending',
      assignedTo: '',
      pricing: {
        totalPayment: configuredPrice,
        currentReceivingPayment: 0,
        remainingAmount: configuredPrice,
      },
    });

    await service.save();

    res.status(201).json({ message: 'Saved', invoiceId: service._id });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});



// 🟢 DELETE: Delete multiple by ID
router.post('/invoices/delete-multiple', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }

    await ServiceDetail.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: 'Deleted successfully' });

  } catch (err) {
    console.error('Deletion Error:', err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});


// 🟢 GET: Admin fetch all services with personal details populated
// GET: Admin fetch all non-manual services with personal details populated
router.get('/admin/services', verifyJWT, async (req, res) => {
  try {
    const query = isRestrictedEmployeeRequest(req) ? assignedToCurrentEmployeeQuery(req, 'assignedTo') : {};
    const entries = await ServiceDetail.find(query)
      .sort({ createdAt: -1 })
      .populate('personalId');
    res.json(entries);
  } catch (err) {
    console.error('Fetch Error:', err);
    if (err && err.stack) {
      console.error('Error stack:', err.stack);
    }
    res.status(500).json({ error: 'Unable to fetch services', details: err && err.message ? err.message : err });
  }
});

// 🟢 GET: Fetch all services (for Challan Management use)
router.get('/service', async (req, res) => {
  try {
    const entries = await ServiceDetail.find()
      .sort({ createdAt: -1 })
      .populate('personalId');

    // Transform data to include personal details and pricing at root level
    const transformedEntries = entries.map((entry) => {
      const obj = entry.toObject ? entry.toObject() : entry;

      const totalPayment = getServicePriceSnapshot(obj);

      return {
        ...obj,
        name: obj.personalId?.name || 'N/A',
        clientName: obj.personalId?.name || 'N/A',
        phone: obj.personalId?.phone || '',
        clientPhone: obj.personalId?.phone || '',
        totalPayment: totalPayment,
      };
    });

    res.json(transformedEntries);
  } catch (err) {
    console.error('Fetch Error:', err);
    if (err && err.stack) {
      console.error('Error stack:', err.stack);
    }
    res.status(500).json({ error: 'Unable to fetch services', details: err && err.message ? err.message : err });
  }
});

// 🟢 PATCH: Upload certificate for a service
// Allow certificate upload even with missing/expired token — tryVerify will attach req.user when possible
router.patch('/admin/services/:id/certificate', tryVerify, upload.single('certificate'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No certificate file uploaded' });
    }
    const updated = await ServiceDetail.findByIdAndUpdate(
      id,
      { certificate: req.file.filename },
      { new: true }
    ).populate('personalId', 'phone');
    if (!updated) return res.status(404).json({ error: 'Service not found' });

    res.json({ message: 'Certificate uploaded', certificate: req.file.filename });
  } catch (err) {
    console.error('Certificate upload error:', err);
    res.status(500).json({ error: 'Failed to upload certificate' });
  }
});
// Allow status updates even with missing/expired token — tryVerify will attach req.user when possible
router.patch('/admin/services/:id/status', tryVerify, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const existing = await ServiceDetail.findById(id);
    if (!existing) return res.status(404).json({ error: 'Service not found' });
    const update = { $set: { status } };
    if (String(existing.status || '') !== String(status || '')) {
      update.$push = { statusHistory: { from: existing.status || '', to: status || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const updated = await ServiceDetail.findByIdAndUpdate(id, update, { new: true }).populate('personalId', 'phone');

    res.json({ message: 'Status updated', service: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});
// Update granular progress status for an admin service
router.patch('/admin/services/:id/progress', tryVerify, async (req, res) => {
  try {
    const { id } = req.params;
    const { progressStatus } = req.body;
    const existing = await ServiceDetail.findById(id);
    if (!existing) return res.status(404).json({ error: 'Service not found' });
    const update = { $set: { progressStatus } };
    if (String(existing.progressStatus || '') !== String(progressStatus || '')) {
      update.$push = { progressHistory: { from: existing.progressStatus || '', to: progressStatus || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const updated = await ServiceDetail.findByIdAndUpdate(id, update, { new: true });
    res.json({ message: 'Progress status updated', service: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress status' });
  }
});


// Send invoice and certificate to user (email + dashboard)
// Sending invoice may be triggered by admins; allow absence of auth header (tryVerify will attach user if a valid token is present)
router.post('/admin/services/:id/send-invoice', tryVerify, sendInvoiceAndCertificate);

// GET payment details for a processing service
router.get('/processing/:id/payments', async (req, res) => {
  try {
    const service = await ServiceDetail.findById(req.params.id).populate('personalId');
    if (!service) return res.status(404).json({ error: 'Service not found' });
    // Extract payment info from formFields
    const formFields = service.formFields || {};
    const payments = Array.isArray(service.payments) ? service.payments : [];
    // If no payments in array, but formFields has initial payment, add it
    if (payments.length === 0 && (formFields.paymentReceived || formFields.advancePayment)) {
      payments.push({
        amount: formFields.paymentReceived || formFields.advancePayment,
        date: formFields.paymentReceivedDate || service.createdAt,
        method: formFields.paymentMethod || '',
        accountNumber: formFields.accountNumber || '',
        personName: formFields.personName || (service.personalId && service.personalId.name) || '',
        remarks: formFields.remarks || '',
        label: 'First Payment',
      });
    }
    const totalPayment = getServicePriceSnapshot(service);
    // Calculate totalPaid and remaining
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingAmount = Math.max(totalPayment - totalPaid, 0);
    res.json({
      payments,
      pricing: {
        totalPayment,
        currentReceivingPayment: totalPaid,
        remainingAmount,
        paymentMethod: payments.length > 0 ? payments[payments.length - 1].method : (formFields.paymentMethod || ''),
        accountNumber: payments.length > 0 ? payments[payments.length - 1].accountNumber : (formFields.accountNumber || ''),
        personName: payments.length > 0 ? payments[payments.length - 1].personName : (formFields.personName || (service.personalId && service.personalId.name) || ''),
        paymentReceivedDate: payments.length > 0 ? payments[payments.length - 1].date : (formFields.paymentReceivedDate || service.createdAt),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment details', details: err.message });
  }
});

// PATCH to update general fields including pricing.totalPayment for processing service
router.patch('/processing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const service = await ServiceDetail.findById(id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // Handle nested field updates (e.g., 'pricing.totalPayment')
    const historyPush = {};
    if (Object.prototype.hasOwnProperty.call(update, 'assignedTo') && String(service.assignedTo || '') !== String(update.assignedTo || '')) {
      historyPush.assignmentHistory = { from: service.assignedTo || '', to: update.assignedTo || '', changedAt: new Date(), changedBy: actorName(req) };
    }
    if (Object.prototype.hasOwnProperty.call(update, 'status') && String(service.status || '') !== String(update.status || '')) {
      historyPush.statusHistory = { from: service.status || '', to: update.status || '', changedAt: new Date(), changedBy: actorName(req) };
    }
    if (Object.prototype.hasOwnProperty.call(update, 'progressStatus') && String(service.progressStatus || '') !== String(update.progressStatus || '')) {
      historyPush.progressHistory = { from: service.progressStatus || '', to: update.progressStatus || '', changedAt: new Date(), changedBy: actorName(req) };
    }

    Object.keys(update).forEach(key => {
      if (key.includes('.')) {
        // Handle dot notation (nested fields)
        const keys = key.split('.');
        let obj = service;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = update[key];
      } else {
        // Handle regular fields
        service[key] = update[key];
      }
    });

    await service.save();
    res.json({ success: true, service });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add a payment to a processing service
router.post('/processing/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const service = await ServiceDetail.findById(id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!service.payments) service.payments = [];
    const previousPaid = service.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    // Add new payment
    service.payments.push({
      amount,
      date,
      method,
      accountNumber,
      personName,
      remarks,
      label: service.payments.length === 0 ? 'First Payment' : service.payments.length === 1 ? 'Second Payment' : `Payment ${service.payments.length + 1}`
    });
    // Update pricing summary
    const totalPayment = getServicePriceSnapshot(service);
    const totalPaid = service.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (!service.pricing) service.pricing = {};
    service.pricing.currentReceivingPayment = totalPaid;
    service.pricing.totalPayment = totalPayment;
    service.pricing.remainingAmount = Math.max(totalPayment - totalPaid, 0);
    service.pricing.paymentMethod = method;
    service.pricing.accountNumber = accountNumber;
    service.pricing.personName = personName;
    service.pricing.paymentReceivedDate = date;
    await service.save();
    const populatedService = await ServiceDetail.findById(service._id).populate('personalId');
    await notifyPaymentReceived({
      doc: populatedService,
      amount,
      previousPaid,
      serviceName: populatedService?.serviceTitle,
      phone: populatedService?.personalId?.phone,
      userId: populatedService?.userId,
      serviceId: populatedService?._id,
    });
    res.json({ success: true, payments: service.payments, pricing: service.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add payment', details: err.message });
  }
});
// Delete a payment for a processing service
router.delete('/processing/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const service = await ServiceDetail.findById(id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!Array.isArray(service.payments) || service.payments.length <= paymentIdx) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    // Remove payment
    service.payments.splice(paymentIdx, 1);
    // Update labels for remaining payments
    service.payments.forEach((p, idx) => {
      p.label = idx === 0 ? 'First Payment' : idx === 1 ? 'Second Payment' : `Payment ${idx + 1}`;
    });
    // Update pricing summary
    const totalPayment = getServicePriceSnapshot(service);
    const totalPaid = service.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (!service.pricing) service.pricing = {};
    // Use last payment for method/person/date if exists
    const last = service.payments.length > 0 ? service.payments[service.payments.length - 1] : {};
    service.pricing.currentReceivingPayment = totalPaid;
    service.pricing.totalPayment = totalPayment;
    service.pricing.remainingAmount = Math.max(totalPayment - totalPaid, 0);
    service.pricing.paymentMethod = last.method || '';
    service.pricing.accountNumber = last.accountNumber || '';
    service.pricing.personName = last.personName || '';
    service.pricing.paymentReceivedDate = last.date || '';
    await service.save();
    res.json({ success: true, payments: service.payments, pricing: service.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment', details: err.message });
  }
});
// Edit a payment for a processing service
router.patch('/processing/:id/payments/:paymentIdx', async (req, res) => {
  try {
    const { id, paymentIdx } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const service = await ServiceDetail.findById(id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!Array.isArray(service.payments) || service.payments.length <= paymentIdx) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    // Update payment fields
    const payment = service.payments[paymentIdx];
    if (typeof amount !== 'undefined') payment.amount = amount;
    if (typeof date !== 'undefined') payment.date = date;
    if (typeof method !== 'undefined') payment.method = method;
    if (typeof accountNumber !== 'undefined') payment.accountNumber = accountNumber;
    if (typeof personName !== 'undefined') payment.personName = personName;
    if (typeof remarks !== 'undefined') payment.remarks = remarks;
    // Update label if needed
    payment.label = payment.label || (paymentIdx == 0 ? 'First Payment' : paymentIdx == 1 ? 'Second Payment' : `Payment ${Number(paymentIdx) + 1}`);
    // Update pricing summary
    const totalPayment = getServicePriceSnapshot(service);
    const totalPaid = service.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (!service.pricing) service.pricing = {};
    service.pricing.currentReceivingPayment = totalPaid;
    service.pricing.totalPayment = totalPayment;
    service.pricing.remainingAmount = Math.max(totalPayment - totalPaid, 0);
    service.pricing.paymentMethod = payment.method;
    service.pricing.accountNumber = payment.accountNumber;
    service.pricing.personName = payment.personName;
    service.pricing.paymentReceivedDate = payment.date;
    await service.save();
    res.json({ success: true, payments: service.payments, pricing: service.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit payment', details: err.message });
  }
});
export default router;
