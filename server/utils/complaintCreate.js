import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import Ticket from '../models/SupportTicket.js';
import User from '../models/User.js';
import { servicePrices } from '../data/servicePrices.js';
import { ticketSubjects } from './ticketRules.js';
const root = fileURLToPath(new URL('../uploads/', import.meta.url));
export async function createComplaint(req, res, notify) {
  let saved = false;
  try {
    const { category, description, phone, email, name, cnic, serviceName } = req.body;
    if (!ticketSubjects.includes(category)) return res.status(400).json({ message: 'Choose a ticket subject' });
    const subject = category === 'Other' ? req.body.subject : category;
    if (![subject, description, phone, email, name, cnic].every(v => typeof v === 'string' && v.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, '')) || !/^\d{13}$/.test(cnic.replace(/[-\s]/g, ''))) return res.status(400).json({ message: 'Enter person name, 13-digit CNIC, subject, issue, valid email and phone' });
    if (subject.length > 180 || description.length > 6000 || name.length > 160 || email.length > 254 || phone.length > 30 || cnic.length > 30) return res.status(400).json({ message: 'One or more complaint fields are too long' });
    const serviceRelated = ['Service Related Problem', 'Refund Service Fee'].includes(category);
    if (serviceRelated && (typeof serviceName !== 'string' || !Object.hasOwn(servicePrices, serviceName))) return res.status(400).json({ message: 'Select the service for this complaint' });
    let clientId = req.user.id;
    if (['admin', 'employee'].includes(req.user.role)) {
      if (typeof req.body.clientId !== 'string' || !/^[a-f0-9]{24}$/i.test(req.body.clientId)) return res.status(400).json({ message: 'Select the client this complaint belongs to' });
      const client = await User.findOne({ _id: req.body.clientId, isAdmin: { $ne: true }, isActive: { $ne: false } }).select('_id').lean();
      if (!client) return res.status(400).json({ message: 'Selected client is unavailable' });
      clientId = client._id;
    }
    const ticket = await Ticket.create({ client: clientId, createdBy: req.user.id, createdByRole: req.user.role, createdByName: req.user.name,
      name: name.trim(), cnic: cnic.replace(/[-\s]/g, ''), reference: 'ZLF-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      category, subject: subject.trim(), description: description.trim(), email: email.trim(), phone: phone.trim(), serviceName: serviceRelated ? serviceName : '',
      attachments: (req.files || []).map(file => ({ filename: file.filename, originalName: file.originalname, mimetype: file.mimetype, size: file.size })),
    });
    saved = true;
    await notify(ticket, 'created');
    res.status(201).json(ticket);
  } finally {
    if (!saved) await Promise.all((req.files || []).map(file => fs.unlink(path.join(root, path.basename(file.filename))).catch(() => {})));
  }
}
