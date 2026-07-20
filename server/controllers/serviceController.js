import ServiceDetail from '../models/Service.js';
import PersonalDetail from '../models/PersonalDetail.js';
import { createEmailTransporter, getEmailFrom } from '../utils/emailTransporter.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getCertificateEmailLogoAttachment } from '../utils/certificateEmail.js';
import { buildPaymentInvoiceEmail, resolvePaymentInvoiceAmounts } from '../utils/paymentInvoiceEmail.js';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const sendInvoiceAndCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    // Find service and populate personal details
    const service = await ServiceDetail.findById(id).populate('personalId');
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const user = service.personalId;
    if (!user || !user.email) return res.status(400).json({ error: 'User email not found' });

    // Only attach certificate
    let attachments = [];
    if (service.certificate) {
      attachments.push({
        filename: service.certificate,
        path: path.join(__dirname, '../uploads/', service.certificate),
      });
    }
    attachments.push(getCertificateEmailLogoAttachment());

    // Send email
    const transporter = createEmailTransporter();
    const paymentSummary = resolvePaymentInvoiceAmounts(service);
    const emailContent = buildPaymentInvoiceEmail({
      recipientName: user.name,
      serviceName: service.serviceTitle,
      referenceId: service._id,
      ...paymentSummary,
    });
    await transporter.sendMail({
      from: getEmailFrom(),
      to: user.email,
      ...emailContent,
      attachments,
    });

    service.invoiceSent = true;
    if (service.certificate) service.certificateEmailSentAt = new Date();
    await service.save();

    res.json({ message: 'Payment invoice sent to user email!', paymentSummary });
  } catch (err) {
    console.error('Send invoice error:', err);
    res.status(500).json({ error: 'Failed to send payment invoice' });
  }
};

// Update a service detail
export const updateServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const service = await ServiceDetail.findById(id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // Handle nested field updates (e.g., 'pricing.totalPayment')
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
};
