// Edit a specific payment for a converted lead
import { notifyPaymentReceived } from '../utils/paymentNotification.js';
import { getCertificateEmailLogoAttachment } from '../utils/certificateEmail.js';
import { autoSendCompletedServiceCertificate } from '../utils/serviceCertificateEmail.js';
import { buildPaymentInvoiceEmail, resolvePaymentInvoiceAmounts } from '../utils/paymentInvoiceEmail.js';

export const editPaymentForConvertedLead = async (id, paymentIdx, paymentData) => {
  const lead = await ConvertedLead.findById(id);
  if (!lead || !Array.isArray(lead.payments) || lead.payments.length <= paymentIdx) return null;
  const payment = lead.payments[paymentIdx];
  if (typeof paymentData.amount !== 'undefined') payment.amount = paymentData.amount;
  if (typeof paymentData.date !== 'undefined') payment.date = paymentData.date;
  if (typeof paymentData.method !== 'undefined') payment.method = paymentData.method;
  if (typeof paymentData.accountNumber !== 'undefined') payment.accountNumber = paymentData.accountNumber;
  if (typeof paymentData.personName !== 'undefined') payment.personName = paymentData.personName;
  if (typeof paymentData.remarks !== 'undefined') payment.remarks = paymentData.remarks;
  // Update label if needed
  payment.label = payment.label || (paymentIdx == 0 ? 'First Payment' : paymentIdx == 1 ? 'Second Payment' : `Payment ${Number(paymentIdx) + 1}`);
  // Update pricing summary
  const totalPaid = lead.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  if (lead.pricing) {
    lead.pricing.currentReceivingPayment = totalPaid;
    lead.pricing.remainingAmount = Math.max((lead.pricing.totalPayment || 0) - totalPaid, 0);
    lead.pricing.paymentMethod = payment.method;
    lead.pricing.accountNumber = payment.accountNumber;
    lead.pricing.personName = payment.personName;
    lead.pricing.paymentReceivedDate = payment.date;
  }
  await lead.save();
  return lead;
};

// Delete a specific payment for a converted lead
export const deletePaymentForConvertedLead = async (id, paymentIdx) => {
  const lead = await ConvertedLead.findById(id);
  if (!lead || !Array.isArray(lead.payments) || lead.payments.length <= paymentIdx) return null;
  lead.payments.splice(paymentIdx, 1);
  // Update labels for remaining payments
  lead.payments.forEach((p, idx) => {
    p.label = idx === 0 ? 'First Payment' : idx === 1 ? 'Second Payment' : `Payment ${idx + 1}`;
  });
  // Update pricing summary
  const totalPaid = lead.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const last = lead.payments.length > 0 ? lead.payments[lead.payments.length - 1] : {};
  if (lead.pricing) {
    lead.pricing.currentReceivingPayment = totalPaid;
    lead.pricing.remainingAmount = Math.max((lead.pricing.totalPayment || 0) - totalPaid, 0);
    lead.pricing.paymentMethod = last.method || '';
    lead.pricing.accountNumber = last.accountNumber || '';
    lead.pricing.personName = last.personName || '';
    lead.pricing.paymentReceivedDate = last.date || '';
  }
  await lead.save();
  return lead;
};
// Add a payment to a converted lead
export const addPaymentToConvertedLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const lead = await ConvertedLead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    lead.payments = lead.payments || [];
    const previousPaid = lead.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    // Label logic
    let label = 'Second Payment';
    if (lead.payments.length === 1) label = 'Third Payment';
    else if (lead.payments.length > 1) label = `Payment ${lead.payments.length + 2}`;
    lead.payments.push({ amount, date, method, accountNumber, personName, remarks, label });
    // Calculate total received: sum of all payments in payments array
    const totalPaid = lead.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (lead.pricing) {
      lead.pricing.currentReceivingPayment = totalPaid;
      lead.pricing.remainingAmount = Math.max((lead.pricing.totalPayment || 0) - totalPaid, 0);
    }
    await lead.save();
    await notifyPaymentReceived({
      doc: lead,
      amount,
      previousPaid,
      serviceName: lead.service || lead.serviceType,
      phone: lead.phone,
      userId: lead._id,
      serviceId: lead._id,
    });
    res.json({ success: true, payments: lead.payments, pricing: lead.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all payments for a converted lead
export const getPaymentsForConvertedLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await ConvertedLead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ payments: lead.payments || [], pricing: lead.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
import ConvertedLead from '../models/ConvertedLead.js';
import Lead from '../models/Lead.js';
import path from 'path';
import fs from 'fs';
import { createEmailTransporter, getEmailFrom } from '../utils/emailTransporter.js';
import PDFDocument from 'pdfkit';

const isEmployeeRequest = (req) => {
  return req.user && !['admin', 'user'].includes(req.user.role);
};

const isRestrictedEmployeeRequest = (req) => (
  isEmployeeRequest(req) && req.user?.canViewAllServices !== true
);

const assignedToCurrentEmployeeQuery = (req, field = 'assigned') => {
  const values = [req.user?.id, req.user?.name, req.user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (values.length === 0) return { [field]: '__NO_ASSIGNED_EMPLOYEE__' };

  return {
    $or: values.map((value) => ({
      [field]: { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }))
  };
};
const actorName = (req) => req.user?.name || req.user?.email || req.user?.id || 'System';
const convertedServiceStatuses = new Set(['pending', 'processing', 'converted', 'completed', 'rejected']);

function normalizeConvertedStatus(status) {
  const value = Array.isArray(status) ? status[status.length - 1] : status;
  return convertedServiceStatuses.has(value) ? value : 'converted';
}

function cleanOptionalEnum(value, allowedValues) {
  const single = Array.isArray(value) ? value[value.length - 1] : value;
  if (typeof single === 'undefined' || single === null || single === '') return undefined;
  return allowedValues.includes(single) ? single : undefined;
}

// Delete a converted lead by ID (hard delete)
export const deleteConvertedLead = async (req, res) => {
  try {
    const lead = await ConvertedLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to handle file fields
function extractFilesFromReq(req) {
  const files = {};
  if (req.files) {
    Object.keys(req.files).forEach(field => {
      if (Array.isArray(req.files[field])) {
        files[field] = req.files[field].map(f => f.filename);
      } else {
        files[field] = req.files[field].filename;
      }
    });
  }
  return files;
}

export const createConvertedLead = async (req, res) => {
  function getSingleValue(val) {
    if (Array.isArray(val)) return val[0];
    return val;
  }
  try {
    console.log('POST /convertedService req.body:', req.body);
    console.log('POST /convertedService req.files:', req.files);
    // Basic fields
    const {
      name, phone, email, assigned, service, price, status, originalLeadId,
      hasEmail, hasPhone,
      totalPayment, advancePayment,
      currentReceivingPayment, remainingAmount, paymentMethod, accountNumber, personName,
      paymentReceivedDate,
      ...rest
    } = req.body;
    // Dynamic fields (non-file)
    const fields = { ...rest };
    // File fields
    const files = extractFilesFromReq(req);
    // Collect all possible payment-related fields from req.body (flattened or nested)
    const paymentFields = [
      'totalPayment',
      'advancePayment',
      'currentPayment',
      'currentReceivingPayment',
      'remainingAmount',
      'paymentMethod',
      'accountNumber',
      'personName',
      'paymentReceivedDate',
    ];

    // Build pricing object from all possible sources
    const pricing = {};
    let initialPayment = null;

    paymentFields.forEach((field) => {
      // Accept both camelCase and snake_case
      let value = req.body[field] || req.body[`pricing.${field}`] || (req.body.pricing && req.body.pricing[field]);
      if (typeof value === 'undefined' || value === null || value === '') return;
      // Always use the last value if array (FormData can send arrays)
      if (Array.isArray(value)) value = value[value.length - 1];
      // Convert numbers and dates
      if ([
        'totalPayment',
        'advancePayment',
        'currentPayment',
        'currentReceivingPayment',
        'remainingAmount',
      ].includes(field)) {
        value = Number(value);
      }
      if (field === 'paymentReceivedDate') {
        value = new Date(value);
        if (Number.isNaN(value.getTime())) return;
      }
      if (field === 'paymentMethod') {
        value = cleanOptionalEnum(value, ['Cash', 'Cheque', 'Bank', 'Easypaisa', 'Jazzcash']);
        if (!value) return;
      }
      // Map currentPayment to currentReceivingPayment if needed
      if (field === 'currentPayment') {
        pricing['currentReceivingPayment'] = value;
        initialPayment = value;
      } else if (field === 'currentReceivingPayment') {
        pricing[field] = value;
        initialPayment = value;
      } else {
        pricing[field] = value;
      }
    });
    // If remainingAmount is not set, calculate it
    if (typeof pricing.remainingAmount === 'undefined' && typeof pricing.totalPayment === 'number' && typeof pricing.currentReceivingPayment === 'number') {
      pricing.remainingAmount = Math.max(pricing.totalPayment - pricing.currentReceivingPayment, 0);
    }

    // Build payments array: if initial payment, add as first payment
    const payments = [];
    if (initialPayment && Number(initialPayment) > 0) {
      payments.push({
        amount: Number(initialPayment),
        date: pricing.paymentReceivedDate || new Date(),
        method: pricing.paymentMethod || '',
        accountNumber: pricing.accountNumber || '',
        personName: pricing.personName || '',
        remarks: '',
        label: 'First Payment',
      });
    }

    const sourceLeadId = getSingleValue(originalLeadId);
    let originalLead = null;
    if (sourceLeadId) {
      originalLead = await Lead.findById(sourceLeadId);
      if (!originalLead) {
        return res.status(404).json({ success: false, error: 'Original lead not found' });
      }

      if (isRestrictedEmployeeRequest(req)) {
        const assignedValues = [req.user?.id, req.user?.name, req.user?.email]
          .filter(Boolean)
          .map((value) => String(value).trim().toLowerCase());
        const assigned = String(originalLead.assigned || '').trim().toLowerCase();
        if (!assignedValues.includes(assigned)) {
          return res.status(403).json({ success: false, error: 'You can only convert leads assigned to you' });
        }
      }
    }

    const sourceEmail = String(originalLead?.email || getSingleValue(email) || '').trim().toLowerCase();
    if (!sourceEmail) {
      return res.status(400).json({ success: false, error: 'Lead email is required before conversion' });
    }
    if (!/^\S+@\S+\.\S+$/.test(sourceEmail)) {
      return res.status(400).json({ success: false, error: 'Lead must have a valid email before conversion' });
    }

    // Use the original lead's private contact data when converting from the lead workflow.
    let savedPhone = getSingleValue(originalLead?.phone || phone);
    try {
      const cp = await import('../services/cpaasService.js');
      if (cp.default && typeof cp.default.normalizeNumber === 'function') {
        savedPhone = cp.default.normalizeNumber(savedPhone);
      }
    } catch (e) {
      // ignore
    }

    const lead = new ConvertedLead({
      name: getSingleValue(originalLead?.name || name),
      phone: savedPhone,
      email: sourceEmail,
      assigned: getSingleValue(originalLead?.assigned || assigned),
      service: getSingleValue(originalLead?.service || service),
      price: price ? Number(getSingleValue(price)) : undefined,
      status: normalizeConvertedStatus(status),
      pricing,
      payments,
      fields,
      files,
    });
    await lead.save();
    if (initialPayment && Number(initialPayment) > 0) {
      await notifyPaymentReceived({
        doc: lead,
        amount: initialPayment,
        previousPaid: 0,
        serviceName: lead.service || lead.serviceType,
        phone: lead.phone,
        userId: lead._id,
        serviceId: lead._id,
      });
    }

    // Remove the original lead from Lead model if originalLeadId is provided
    if (sourceLeadId) {
      await Lead.findByIdAndDelete(sourceLeadId);
    }
    res.status(201).json({ success: true, lead });
  } catch (err) {
    console.error('Error in createConvertedLead:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAllConvertedLeads = async (req, res) => {
  try {
    const query = isRestrictedEmployeeRequest(req) ? assignedToCurrentEmployeeQuery(req, 'assigned') : {};
    const leads = await ConvertedLead.find(query).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getConvertedLead = async (req, res) => {
  try {
    const lead = await ConvertedLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Send invoice (PDF only, links for files)
export const sendInvoice = async (req, res) => {
  try {
    const lead = await ConvertedLead.findById(req.params.id);
    if (!lead) {
      console.error('ConvertedLead not found for sendInvoice. Requested ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Converted client not found. Please refresh the page and try again.' });
    }
    // Use email from request body if provided, else from lead
    const recipientEmail = req.body.email || lead.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No recipient email found for this lead.' });
    }
    // Only attach certificate
    let attachments = [];
    const uploadsPath = path.join(process.cwd(), 'uploads');
    if (lead.certificate) {
      const certPath = path.join(uploadsPath, lead.certificate);
      if (fs.existsSync(certPath)) {
        attachments.push({ filename: lead.certificate, path: certPath });
      }
    }
    attachments.push(getCertificateEmailLogoAttachment());
    // Send email
    const transporter = createEmailTransporter();
    const paymentSummary = resolvePaymentInvoiceAmounts(lead);
    const emailContent = buildPaymentInvoiceEmail({
      recipientName: lead.name,
      serviceName: lead.service,
      referenceId: lead._id,
      ...paymentSummary,
    });
    await transporter.sendMail({
      from: getEmailFrom(),
      to: recipientEmail,
      ...emailContent,
      attachments,
    });
    if (lead.certificate && attachments.some((attachment) => attachment.filename === lead.certificate)) {
      lead.certificateEmailSentAt = new Date();
    }
    await lead.save();
    res.json({ success: true, message: 'Payment invoice sent to user email!', paymentSummary });
  } catch (err) {
    console.error('Error sending invoice:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upload certificate for a converted lead
export const uploadCertificate = async (req, res) => {
  try {
    const lead = await ConvertedLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    lead.certificate = req.file.filename;
    lead.certificateEmailSentAt = null;
    await lead.save();

    let certificateEmail;
    try {
      certificateEmail = await autoSendCompletedServiceCertificate({
        service: lead,
        recipientEmail: lead.email,
        recipientName: lead.name,
        serviceName: lead.service,
      });
    } catch (mailError) {
      console.error('Automatic converted-service certificate email failed after upload:', mailError);
      certificateEmail = { sent: false, reason: 'email_send_failed' };
    }

    res.json({ success: true, message: 'Certificate uploaded', certificate: req.file.filename, certificateEmail });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update assigned field for a converted lead
export const updateAssigned = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned } = req.body;
    const existing = await ConvertedLead.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });
    const update = { $set: { assigned } };
    if (String(existing.assigned || '') !== String(assigned || '')) {
      update.$push = { assignmentHistory: { from: existing.assigned || '', to: assigned || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const lead = await ConvertedLead.findByIdAndUpdate(id, update, { new: true });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update status field for a converted lead
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const existing = await ConvertedLead.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });
    const update = { $set: { status } };
    if (String(existing.status || '') !== String(status || '')) {
      update.$push = { statusHistory: { from: existing.status || '', to: status || '', changedAt: new Date(), changedBy: actorName(req) } };
    }
    const lead = await ConvertedLead.findByIdAndUpdate(id, update, { new: true });

    let certificateEmail;
    try {
      certificateEmail = await autoSendCompletedServiceCertificate({
        service: lead,
        recipientEmail: lead.email,
        recipientName: lead.name,
        serviceName: lead.service,
      });
    } catch (mailError) {
      console.error('Automatic converted-service certificate email failed after completion:', mailError);
      certificateEmail = { sent: false, reason: 'email_send_failed' };
    }

    res.json({ success: true, lead, certificateEmail });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// General update endpoint for a converted lead (PATCH for partial update)
export const updateConvertedLead = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const lead = await ConvertedLead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const historyPush = {};
    if (Object.prototype.hasOwnProperty.call(update, 'assigned') && String(lead.assigned || '') !== String(update.assigned || '')) {
      historyPush.assignmentHistory = { from: lead.assigned || '', to: update.assigned || '', changedAt: new Date(), changedBy: actorName(req) };
    }
    if (Object.prototype.hasOwnProperty.call(update, 'status') && String(lead.status || '') !== String(update.status || '')) {
      historyPush.statusHistory = { from: lead.status || '', to: update.status || '', changedAt: new Date(), changedBy: actorName(req) };
    }
    if (Object.prototype.hasOwnProperty.call(update, 'progressStatus') && String(lead.progressStatus || '') !== String(update.progressStatus || '')) {
      historyPush.progressHistory = { from: lead.progressStatus || '', to: update.progressStatus || '', changedAt: new Date(), changedBy: actorName(req) };
    }

    // Handle nested field updates (e.g., 'pricing.totalPayment')
    Object.keys(update).forEach(key => {
      if (key.includes('.')) {
        // Handle dot notation (nested fields)
        const keys = key.split('.');
        let obj = lead;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = update[key];
      } else {
        // Handle regular fields
        lead[key] = update[key];
      }
    });
    Object.entries(historyPush).forEach(([key, value]) => {
      lead[key] = lead[key] || [];
      lead[key].push(value);
    });

    await lead.save();
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
