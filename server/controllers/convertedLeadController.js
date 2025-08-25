import ConvertedLead from '../models/ConvertedLead.js';
import Lead from '../models/Lead.js';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

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
  try {
    // Basic fields
    const { name, phone, email, assigned, service, price, status, originalLeadId, ...rest } = req.body;
    // Dynamic fields (non-file)
    const fields = { ...rest };
    // File fields
    const files = extractFilesFromReq(req);
    const lead = new ConvertedLead({
      name, phone, email, assigned, service, price: price ? Number(price) : undefined, status,
      fields,
      files,
    });
    await lead.save();
    // Remove the original lead from Lead model if originalLeadId is provided
    if (originalLeadId) {
      await Lead.findByIdAndDelete(originalLeadId);
    }
    res.status(201).json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAllConvertedLeads = async (req, res) => {
  try {
    const leads = await ConvertedLead.find().sort({ createdAt: -1 });
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
    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `Your Certificate for ${lead.service || 'Service'}`,
      text: `Dear ${lead.name || 'User'},\n\nPlease find attached your certificate for the service: ${lead.service || 'Service'}.\n\nThank you for choosing Zumar Law Firm.`,
      attachments,
    });
    res.json({ success: true, message: 'Certificate sent to user email!' });
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
    await lead.save();
    res.json({ success: true, message: 'Certificate uploaded', certificate: req.file.filename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update assigned field for a converted lead
export const updateAssigned = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned } = req.body;
    const lead = await ConvertedLead.findByIdAndUpdate(id, { assigned }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
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
    const lead = await ConvertedLead.findByIdAndUpdate(id, { status }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// General update endpoint for a converted lead (PATCH for partial update)
export const updateConvertedLead = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const lead = await ConvertedLead.findByIdAndUpdate(id, update, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};