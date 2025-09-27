import ServiceDetail from '../models/Service.js';
import PersonalDetail from '../models/PersonalDetail.js';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Email transporter setup (use your .env for credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Your Certificate for ${service.serviceTitle}`,
      text: `Dear ${user.name},\n\nPlease find attached your certificate for the service: ${service.serviceTitle}.\n\nThank you for choosing Zumar Law Firm.`,
      attachments,
    });

    service.invoiceSent = true;
    await service.save();

    res.json({ message: 'Certificate sent to user email!' });
  } catch (err) {
    console.error('Send invoice error:', err);
    res.status(500).json({ error: 'Failed to send invoice/certificate' });
  }
};
