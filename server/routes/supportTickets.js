import express from 'express';
import crypto from 'crypto';
import Ticket from '../models/SupportTicket.js';
import Job from '../models/NotificationJob.js';
import { enqueueNotification } from '../utils/notificationQueue.js';
import { ticketSubjects, ticketStatuses, normalizeTicketStatus } from '../utils/ticketRules.js';
import { buildTicketEmail } from '../utils/ticketEmail.js';
const router = express.Router();
async function notify(ticket, event) {
  const text = event === 'created' ? `Your support ticket ${ticket.reference} has been received. Subject: ${ticket.subject}` : `Your support ticket ${ticket.reference} is ${ticket.status === 'completed' ? 'completed' : 'resolved'}. ${ticket.resolution}`;
  const message = `${text}\nZumar Law Firm | 051-8445095 | team@zumarlawfirm.com`;
  await Promise.all(['sms', 'email'].map(channel => enqueueNotification({
    key: crypto.createHash('sha256').update(`ticket:${ticket.id}:${event}:${channel}`).digest('hex'),
    channel, serviceId: ticket.id, recipient: channel === 'sms' ? ticket.phone : ticket.email,
    payload: channel === 'sms' ? { message } : buildTicketEmail(ticket, event),
  })));
}
router.use((req, res, next) => ['admin', 'user'].includes(req.user.role) ? next() : res.status(403).json({ message: 'Client or administrator access required' }));
router.get('/', async (req, res) => {
  const tickets = await Ticket.find(req.user.role === 'admin' ? {} : { client: req.user.id }).sort({ createdAt: -1 }).limit(200).lean();
  const deliveries = await Job.find({ serviceId: { $in: tickets.map(t => String(t._id)) } }).select('serviceId channel status lastError').lean();
  res.json(tickets.map(t => ({ ...t, status: normalizeTicketStatus(t.status), deliveries: deliveries.filter(j => j.serviceId === String(t._id)) })));
});
router.post('/', async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ message: 'Only clients can submit tickets' });
  const { category, description, phone, email } = req.body;
  if (!ticketSubjects.includes(category)) return res.status(400).json({ message: 'Choose a ticket subject' });
  const subject = category === 'Other' ? req.body.subject : category;
  if (![subject, description, phone, email].every(v => typeof v === 'string' && v.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ''))) return res.status(400).json({ message: 'Enter a subject, issue description, valid email and phone number' });
  if (subject.length > 180 || description.length > 6000) return res.status(400).json({ message: 'Subject or description is too long' });
  const ticket = await Ticket.create({ client: req.user.id, name: req.user.name, reference: 'ZLF-' + crypto.randomBytes(6).toString('hex').toUpperCase(), category, subject: subject.trim(), description: description.trim(), email: email.trim(), phone: phone.trim() });
  await notify(ticket, 'created');
  res.status(201).json(ticket);
});
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access required' });
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid ticket' });
  const { status, resolution } = req.body;
  const closing = ['resolved', 'completed'].includes(status);
  if (resolution !== undefined && (typeof resolution !== 'string' || resolution.length > 6000)) return res.status(400).json({ message: 'Resolution must be text up to 6000 characters' });
  if (!ticketStatuses.includes(status) || (closing && (typeof resolution !== 'string' || !resolution.trim() || resolution.length > 6000))) return res.status(400).json({ message: 'Choose a valid status and provide a resolution when resolving or completing' });
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, status: { $nin: ['resolved', 'completed'] } }, { $set: { status, ...(resolution !== undefined ? { resolution: resolution.trim() } : {}), ...(closing ? { resolvedAt: new Date(), resolvedBy: String(req.user.id) } : {}) } }, { new: true, runValidators: true });
  if (!ticket) return res.status(409).json({ message: 'Ticket is already resolved or unavailable' });
  if (closing) await notify(ticket, 'resolved');
  res.json(ticket);
});
export default router;
