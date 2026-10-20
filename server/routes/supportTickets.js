import express from 'express';
import { createComplaint } from '../utils/complaintCreate.js';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import JSZip from 'jszip';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ticket from '../models/SupportTicket.js';
import User from '../models/User.js';
import Job from '../models/NotificationJob.js';
import { uploadOptions } from '../utils/uploadOptions.js';
import { servicePrices } from '../data/servicePrices.js';
import { enqueueNotification } from '../utils/notificationQueue.js';
import { ticketStatuses, normalizeTicketStatus } from '../utils/ticketRules.js';
import { buildTicketEmail } from '../utils/ticketEmail.js';
const router = express.Router();
const uploadRoot = fileURLToPath(new URL('../uploads/', import.meta.url));
const upload = multer({ ...uploadOptions, limits: { ...uploadOptions.limits, files: 10, fields: 30 } }).array('attachments', 10);
const staff = user => ['admin', 'employee'].includes(user.role);
export const ticketScope = user => ({ deletedAt: null, ...(user.role === 'admin' ? {} : user.role === 'employee' ? { createdBy: user.id } : { client: user.id }) });
const validId = id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
async function removeUploads(files = []) { await Promise.all(files.map(file => fs.unlink(path.join(uploadRoot, path.basename(file.filename))).catch(() => {}))); }
async function notify(ticket, event) {
  const text = event === 'created' ? `Your support ticket ${ticket.reference} has been received. Subject: ${ticket.subject}` : `Your support ticket ${ticket.reference} is ${ticket.status === 'completed' ? 'completed' : 'resolved'}. ${ticket.resolution}`;
  const message = `${text}\nZumar Law Firm | 051-8445095 | team@zumarlawfirm.com`;
  await Promise.all(['sms', 'email'].map(channel => enqueueNotification({
    key: crypto.createHash('sha256').update(`ticket:${ticket.id}:${event}:${channel}`).digest('hex'),
    channel, serviceId: ticket.id, recipient: channel === 'sms' ? ticket.phone : ticket.email,
    payload: channel === 'sms' ? { message } : buildTicketEmail(ticket, event),
  })));
}
router.use((req, res, next) => ['admin', 'employee', 'user'].includes(req.user.role) ? next() : res.status(403).json({ message: 'Please sign in' }));
router.use((req, res, next) => {
  if (req.method !== 'POST' || req.path !== '/') return next();
  upload(req, res, async error => {
    if (!error) return next();
    await removeUploads(req.files);
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Each attachment must be 10 MB or smaller' : error.message || 'Upload up to 10 supported documents' });
  });
});
router.get('/options', async (req, res) => {
  const profile = req.user.role === 'user' ? await User.findById(req.user.id).select('firstName lastName email phoneNumber').lean() : null;
  res.json({ services: Object.keys(servicePrices), profile });
});
router.get('/clients', async (req, res) => {
  if (!staff(req.user)) return res.status(403).json({ message: 'Staff access required' });
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search.length < 2) return res.json([]);
  if (search.length > 120) return res.status(400).json({ message: 'Search is too long' });
  const regex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clients = await User.find({ isAdmin: { $ne: true }, isActive: { $ne: false }, $or: ['firstName', 'lastName', 'email', 'phoneNumber'].map(key => ({ [key]: { $regex: regex, $options: 'i' } })) })
    .select('firstName lastName email phoneNumber').sort({ firstName: 1 }).limit(20).lean();
  res.json(clients);
});
router.get('/', async (req, res) => {
  const tickets = await Ticket.find(ticketScope(req.user)).sort({ createdAt: -1 }).limit(200).lean();
  const deliveries = await Job.find({ serviceId: { $in: tickets.map(t => String(t._id)) } }).select('serviceId channel status lastError').lean();
  res.json(tickets.map(t => ({ ...t, status: normalizeTicketStatus(t.status), deliveries: deliveries.filter(j => j.serviceId === String(t._id)) })));
});
router.post('/', async (req, res) => createComplaint(req, res, notify));
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access required' });
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid ticket' });
  const { status, resolution } = req.body;
  const closing = ['resolved', 'completed'].includes(status);
  if (resolution !== undefined && (typeof resolution !== 'string' || resolution.length > 6000)) return res.status(400).json({ message: 'Resolution must be text up to 6000 characters' });
  if (!ticketStatuses.includes(status) || (closing && (typeof resolution !== 'string' || !resolution.trim() || resolution.length > 6000))) return res.status(400).json({ message: 'Choose a valid status and provide a resolution when resolving or completing' });
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, deletedAt: null, status: { $nin: ['resolved', 'completed'] } }, { $set: { status, ...(resolution !== undefined ? { resolution: resolution.trim() } : {}), ...(closing ? { resolvedAt: new Date(), resolvedBy: String(req.user.id) } : {}) } }, { new: true, runValidators: true });
  if (!ticket) return res.status(409).json({ message: 'Ticket is already resolved or unavailable' });
  if (closing) await notify(ticket, 'resolved');
  res.json(ticket);
});
router.get('/:id/attachments', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ticket' });
  const ticket = await Ticket.findOne({ _id: req.params.id, ...ticketScope(req.user) }).lean();
  if (!ticket?.attachments?.length) return res.status(404).json({ message: 'No attachments found' });
  const archive = new JSZip();
  const files = [];
  for (const [index, attachment] of ticket.attachments.entries()) {
    const filename = attachment.filename;
    if (!filename || filename !== path.basename(filename) || /[\\/\x00-\x1f]/.test(filename) || filename.includes('..')) return res.status(404).json({ message: 'File unavailable' });
    const location = path.join(uploadRoot, filename);
    try { await fs.access(location); } catch { return res.status(404).json({ message: 'An attachment is unavailable' }); }
    const original = String(attachment.originalName || filename).replace(/\\/g, '/').split('/').pop().replace(/[\x00-\x1f]/g, '') || 'attachment';
    files.push({ location, name: `${String(index + 1).padStart(2, '0')}-${original}` });
  }
  for (const file of files) archive.file(file.name, createReadStream(file.location));
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.attachment(`${String(ticket.reference || 'ticket').replace(/[^a-z0-9-]/gi, '')}-attachments.zip`);
  const stream = archive.generateNodeStream({ streamFiles: true, compression: 'STORE' });
  stream.on('error', error => res.destroy(error));
  return stream.pipe(res);
});
router.get('/:id/attachments/:attachmentId', async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.attachmentId)) return res.status(400).json({ message: 'Invalid attachment' });
  const ticket = await Ticket.findOne({ _id: req.params.id, ...ticketScope(req.user) }).lean();
  const attachment = ticket?.attachments?.find(file => String(file._id) === req.params.attachmentId);
  if (!attachment || attachment.filename !== path.basename(attachment.filename)) return res.status(404).json({ message: 'Attachment not found' });
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
  return res.download(path.join(uploadRoot, attachment.filename), attachment.originalName, error => { if (error && !res.headersSent) res.status(404).json({ message: 'File unavailable' }); });
});
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only administrators can delete complaints' });
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint' });
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { $set: { deletedAt: new Date(), deletedBy: String(req.user.id) } }, { new: true });
  if (!ticket) return res.status(404).json({ message: 'Complaint not found' });
  await Job.deleteMany({ serviceId: String(ticket._id), status: 'pending' });
  res.json({ message: 'Complaint deleted' });
});
export default router;
