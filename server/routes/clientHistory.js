import express from 'express';
import Lead from '../models/Lead.js';
import ConvertedLead from '../models/ConvertedLead.js';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import ServiceDetail from '../models/Service.js';
import PersonalDetail from '../models/PersonalDetail.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (value) => String(value || '').trim();
const digits = (value) => clean(value).replace(/\D/g, '');
const fieldRegex = (value) => ({ $regex: `^${escapeRegex(clean(value))}$`, $options: 'i' });

const phoneRegexes = (phone) => {
  const phoneDigits = digits(phone);
  if (!phoneDigits) return [];

  const localNumber = phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits.replace(/^0/, '');
  const withLeadingZero = localNumber.length === 10 ? `0${localNumber}` : localNumber;
  const withCountryCode = localNumber.length === 10 ? `92${localNumber}` : localNumber;

  return Array.from(new Set([
    clean(phone),
    phoneDigits,
    localNumber,
    withLeadingZero,
    withCountryCode,
    `+${withCountryCode}`
  ].filter(Boolean))).map((value) => ({
    phone: { $regex: escapeRegex(value), $options: 'i' }
  }));
};

const buildContactQuery = ({ email, phone }) => {
  const or = [];
  if (clean(email)) or.push({ email: fieldRegex(email) });
  if (clean(phone)) or.push(...phoneRegexes(phone));
  return or.length ? { $or: or } : null;
};

const toPlain = (doc) => doc?.toObject ? doc.toObject() : doc;
const maskPhoneNumber = (phone) => (phone ? '********' : phone);

const maskPhoneFields = (value) => {
  if (Array.isArray(value)) return value.map(maskPhoneFields);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => {
    if (/phone|mobile|contact/i.test(key) && typeof fieldValue !== 'object') {
      return [key, maskPhoneNumber(fieldValue)];
    }
    return [key, maskPhoneFields(fieldValue)];
  }));
};

const maskRecordPhones = (record) => ({
  ...record,
  phone: maskPhoneNumber(record.phone),
  referralPhone: maskPhoneNumber(record.referralPhone),
  fields: maskPhoneFields(record.fields)
});

const paymentSummary = (record = {}) => {
  const payments = Array.isArray(record.payments) ? record.payments : [];
  const totalReceived = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalPayment = Number(record.pricing?.totalPayment || 0);
  const remainingAmount = typeof record.pricing?.remainingAmount !== 'undefined'
    ? Number(record.pricing.remainingAmount || 0)
    : Math.max(totalPayment - totalReceived, 0);
  const lastPayment = payments.length ? payments[payments.length - 1] : null;

  return {
    totalPayment,
    totalReceived,
    remainingAmount,
    installments: payments.length,
    clearanceDate: remainingAmount <= 0 && lastPayment ? lastPayment.date : null,
    payments
  };
};

const mapLead = (lead) => ({
  id: lead._id,
  type: 'Lead',
  name: lead.name,
  email: lead.email,
  phone: lead.phone,
  interestedService: lead.service,
  currentEmployee: lead.assigned,
  currentStatus: lead.status,
  createdAt: lead.createdAt,
  statusChangedAt: lead.statusChangedAt,
  remarks: lead.remarks,
  referralName: lead.referralName,
  referralPhone: lead.referralPhone,
  assignmentHistory: lead.assignmentHistory || [],
  statusHistory: lead.statusHistory || [],
  followUps: lead.followUps || [],
  payments: [],
  paymentSummary: paymentSummary(lead)
});

const mapService = (record, type, personal = {}) => {
  const plain = toPlain(record);
  const name = plain.name || personal.name || plain.primaryName;
  const email = plain.email || personal.email;
  const phone = plain.phone || personal.phone;
  return {
    id: plain._id,
    type,
    name,
    email,
    phone,
    interestedService: plain.service || plain.serviceType || plain.serviceTitle,
    currentEmployee: plain.assigned || plain.assignedTo,
    currentStatus: plain.status,
    progressStatus: plain.progressStatus,
    paymentStatus: plain.paymentStatus,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    fields: plain.fields || plain.formFields || {},
    assignmentHistory: plain.assignmentHistory || [],
    statusHistory: plain.statusHistory || [],
    progressHistory: plain.progressHistory || [],
    paymentStatusHistory: plain.paymentStatusHistory || [],
    followUps: [],
    payments: plain.payments || [],
    pricing: plain.pricing || {},
    paymentSummary: paymentSummary(plain)
  };
};

router.get('/', verifyJWT, async (req, res) => {
  try {
    const { email = '', phone = '' } = req.query;
    const canViewPhone = req.user?.role === 'admin';
    const contactQuery = buildContactQuery({ email, phone });
    const baseQuery = contactQuery || {};

    const personalDetails = await PersonalDetail.find(baseQuery).sort({ createdAt: -1 }).lean();
    const personalIds = personalDetails.map((item) => item._id);

    const [leads, convertedServices, manualServices, processingServices] = await Promise.all([
      Lead.find(baseQuery).sort({ createdAt: -1 }).lean(),
      ConvertedLead.find(baseQuery).sort({ createdAt: -1 }).lean(),
      ManualServiceSubmission.find(baseQuery).sort({ createdAt: -1 }).lean(),
      ServiceDetail.find(contactQuery ? (personalIds.length ? { personalId: { $in: personalIds } } : { _id: { $exists: false } }) : {})
        .populate('personalId')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const personalById = new Map(personalDetails.map((item) => [String(item._id), item]));
    const records = [
      ...leads.map(mapLead),
      ...convertedServices.map((item) => mapService(item, 'Converted Service')),
      ...manualServices.map((item) => mapService(item, 'Manual Service')),
      ...processingServices.map((item) => {
        const personal = item.personalId ? toPlain(item.personalId) : personalById.get(String(item.personalId));
        return mapService(item, 'Processing Service', personal);
      })
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const visibleRecords = canViewPhone ? records : records.map(maskRecordPhones);
    const firstRecord = visibleRecords[0];

    res.json({
      query: { email: clean(email), phone: canViewPhone ? clean(phone) : maskPhoneNumber(clean(phone)) },
      client: firstRecord
        ? { name: firstRecord.name, email: firstRecord.email, phone: firstRecord.phone }
        : { name: '', email: clean(email), phone: canViewPhone ? clean(phone) : maskPhoneNumber(clean(phone)) },
      counts: {
        leads: leads.length,
        convertedServices: convertedServices.length,
        manualServices: manualServices.length,
        processingServices: processingServices.length,
        total: records.length
      },
      records: visibleRecords
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch client history', error: err.message });
  }
});

export default router;
