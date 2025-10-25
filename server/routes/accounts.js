import express from 'express';
import invoice from '../models/Invoice.js';
import Payroll from '../models/Payroll.js';
import Account from '../models/Account.js';
import ServiceDetail from '../models/Service.js';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import ConvertedLead from '../models/ConvertedLead.js';
import { servicePrices } from '../data/servicePrices.js';
const router = express.Router();

// CREATE Account
router.post('/', async (req, res) => {
  try {
    const { user, service, lead, totalPrice, advancePayment, remainingPayment, paymentStatus, currentReceivingPayment, paymentMethod, accountNumber, personName, paymentDate } = req.body;

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
    const total = totalPrice ? Number(totalPrice) : 0;
    const pricing = {
      totalPayment: total,
      currentReceivingPayment: initialPaid,
      remainingAmount: Math.max(total - initialPaid, 0),
      paymentMethod,
      accountNumber,
      personName,
      paymentReceivedDate: paymentDate || undefined
    };
    const account = new Account({ user, service, lead, totalPrice, advancePayment, remainingPayment, paymentStatus, payments, pricing });
    await account.save();
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});
// Add payment to ConvertedLead or ManualServiceSubmission
router.post('/add-payment/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const paymentData = req.body;
    let doc;
    if (type === 'converted') {
      doc = await ConvertedLead.findById(id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (!doc.payments) doc.payments = [];
      doc.payments.push({
        amount: paymentData.amount,
        date: paymentData.date,
        method: paymentData.method,
        accountNumber: paymentData.accountNumber,
        personName: paymentData.personName,
        remarks: paymentData.remarks,
        document: paymentData.document || {}
      });
      // Always recalculate pricing summary after every payment
      let totalPaid = doc.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      if (doc.pricing) {
        // If a new totalPayment is provided in the request, update it
        if (typeof paymentData.totalPayment !== 'undefined' && paymentData.totalPayment !== null && paymentData.totalPayment !== '') {
          doc.pricing.totalPayment = Number(paymentData.totalPayment);
        }
        doc.pricing.currentReceivingPayment = totalPaid;
        doc.pricing.remainingAmount = Math.max((doc.pricing.totalPayment || 0) - totalPaid, 0);
      }
      await doc.save();
      res.json({ success: true, payments: doc.payments, pricing: doc.pricing });
    } else if (type === 'manual') {
      doc = await ManualServiceSubmission.findById(id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (!doc.payments) doc.payments = [];
      doc.payments.push({
        amount: paymentData.amount,
        date: paymentData.date,
        method: paymentData.method,
        accountNumber: paymentData.accountNumber,
        personName: paymentData.personName,
        remarks: paymentData.remarks,
        document: paymentData.document || {}
      });
      // Update pricing summary
      let totalPaid = doc.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      if (doc.pricing) {
        doc.pricing.currentReceivingPayment = totalPaid;
        doc.pricing.remainingAmount = Math.max((doc.pricing.totalPayment || 0) - totalPaid, 0);
      }
      await doc.save();
      res.json({ success: true, payments: doc.payments, pricing: doc.pricing });
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to add payment', details: err.message });
  }
});

// GET all Accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find().populate('user service lead');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /accounts/summary - returns total received, pending, salary paid, profit (simple sums)
router.get('/summary', async (req, res) => {
  try {
    // Fetch all service types
    const [services, manuals, converteds] = await Promise.all([
      ServiceDetail.find(),
      ManualServiceSubmission.find(),
      ConvertedLead.find()
    ]);

    // Helper to sum payments and pending for a list
    function sumPayments(arr) {
      return arr.reduce((sum, svc) => {
        if (Array.isArray(svc.payments)) {
          return sum + svc.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        }
        return sum;
      }, 0);
    }
    function sumPending(arr) {
      return arr.reduce((sum, svc) => {
        if (svc.pricing && typeof svc.pricing.remainingAmount === 'number') {
          return sum + svc.pricing.remainingAmount;
        }
        return sum;
      }, 0);
    }

    const totalReceived = sumPayments(services) + sumPayments(manuals) + sumPayments(converteds);
    const totalPending = sumPending(services) + sumPending(manuals) + sumPending(converteds);

    // Salary paid from payrolls: sum all payroll records' salary values
    let payrolls = [];
    let salaryPaid = 0;
    try {
    // Sum only payrolls with status 'Paid' for total salary paid
    const paidPayrolls = await Payroll.find({ status: 'Paid' });
    salaryPaid = paidPayrolls.reduce((acc, p) => acc + Number(p.salary || 0), 0);
    // Also fetch all payrolls for display (no limit requested)
    payrolls = await Payroll.find().sort({ createdAt: -1 });
    } catch (e) {
      console.error('Error loading payrolls:', e);
      return res.status(500).json({ error: 'Error loading payrolls', details: e.message, stack: e.stack });
    }

    // Calculate totalRevenue (sum of all totalPayment fields)
    function sumTotalPayment(arr) {
      return arr.reduce((sum, svc) => {
        if (svc.pricing && typeof svc.pricing.totalPayment === 'number') {
          return sum + svc.pricing.totalPayment;
        }
        return sum;
      }, 0);
    }
    const totalRevenue = sumTotalPayment(services) + sumTotalPayment(manuals) + sumTotalPayment(converteds);

    // Revenue by service (service name -> totalPayment sum)
    const revenueByServices = {};
    function addToRevenueByService(arr, getName) {
      arr.forEach(svc => {
        const name = getName(svc);
        const amt = (svc.pricing && typeof svc.pricing.totalPayment === 'number') ? svc.pricing.totalPayment : 0;
        if (!revenueByServices[name]) revenueByServices[name] = 0;
        revenueByServices[name] += amt;
      });
    }
    addToRevenueByService(services, svc => svc.serviceTitle || svc.service || 'Processing');
    addToRevenueByService(manuals, svc => svc.serviceType || 'Manual');
    addToRevenueByService(converteds, svc => svc.service || 'Converted');

    // Profit: received - salaryPaid
    const totalProfit = totalReceived - salaryPaid;
    res.json({
      totalRevenue,
      totalReceived,
      totalPending,
      remainingAmount: totalPending,
      salaryPaid,
      totalProfit,
      revenueByServices,
      latestPayrolls: payrolls
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts summary', details: err && err.stack ? err.stack : String(err), full: err });
  }
});
// GET all services for account stats modal (Converted, Manual, Service Processing)
router.get('/services-stats', async (req, res) => {
  try {
    // Fetch all
    const [converted, manual, processing] = await Promise.all([
      ConvertedLead.find(),
      ManualServiceSubmission.find(),
      ServiceDetail.find().populate('personalId')
    ]);

    // Helper to extract fields
    function extractFields(row, type) {
      if (!row) return {};
      if (type === 'converted') {
        const pricing = row.pricing || {};
        return {
          service: row.service || '',
          serviceType: row.service || row.serviceType || row.serviceTitle || '',
          name: row.name || '',
          phone: row.phone || '',
          totalPayment: pricing.totalPayment || '',
          currentReceivingPayment: pricing.currentReceivingPayment || '',
          remainingAmount: pricing.remainingAmount || '',
          paymentMethod: pricing.paymentMethod || '',
          accountNumber: pricing.accountNumber || '',
          paymentReceivedDate: pricing.paymentReceivedDate || '',
          personName: pricing.personName || '',
          // additionalPayments removed
          payments: (row.payments || []).map(p => ({
            amount: p.amount,
            date: p.date,
            method: p.method,
            accountNumber: p.accountNumber,
            remarks: p.remarks
          })),
          _id: row._id,
          type: 'converted',
        };
      }
      if (type === 'manual') {
        const pricing = row.pricing || {};
        return {
          service: row.serviceType || '',
          serviceType: row.serviceType || row.serviceTitle || '',
          name: row.name || '',
          phone: row.phone || '',
          totalPayment: pricing.totalPayment || row.totalPayment || '',
          currentReceivingPayment: pricing.currentReceivingPayment || row.currentReceivingPayment || '',
          remainingAmount: pricing.remainingAmount || row.remainingAmount || '',
          paymentMethod: pricing.paymentMethod || row.paymentMethod || '',
          accountNumber: pricing.accountNumber || '',
          paymentReceivedDate: pricing.paymentReceivedDate || '',
          personName: pricing.personName || row.personName || '',
          // additionalPayments removed
          payments: (row.payments || []).map(p => ({
            amount: p.amount,
            date: p.date,
            method: p.method,
            personName: p.personName,
            accountNumber: p.accountNumber,
            remarks: p.remarks
          })),
          _id: row._id,
          type: 'manual',
        };
      }
      if (type === 'processing') {
        const serviceTitle = row.serviceTitle || '';
        const fixedPrice = servicePrices[serviceTitle] || 0;
        const formFields = row.formFields || {};
        const personal = row.personalId || {};
        // Use payments/pricing if available
        let currentReceivingPayment = 0;
        let remainingAmount = fixedPrice;
        let paymentMethod = '';
        let accountNumber = '';
        let paymentReceivedDate = '';
        let personName = '';
        if (row.pricing && typeof row.pricing.currentReceivingPayment === 'number') {
          currentReceivingPayment = row.pricing.currentReceivingPayment;
          remainingAmount = typeof row.pricing.remainingAmount === 'number' ? row.pricing.remainingAmount : (fixedPrice - currentReceivingPayment);
          paymentMethod = row.pricing.paymentMethod || '';
          accountNumber = row.pricing.accountNumber || '';
          paymentReceivedDate = row.pricing.paymentReceivedDate || '';
          personName = row.pricing.personName || '';
        } else if (Array.isArray(row.payments) && row.payments.length > 0) {
          currentReceivingPayment = row.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          remainingAmount = fixedPrice - currentReceivingPayment;
          const last = row.payments[row.payments.length-1];
          paymentMethod = last.method || '';
          accountNumber = last.accountNumber || '';
          paymentReceivedDate = last.date || '';
          personName = last.personName || '';
        } else {
          currentReceivingPayment = (formFields.paymentReceived || formFields.advancePayment) || 0;
          remainingAmount = fixedPrice - currentReceivingPayment;
          paymentMethod = formFields.paymentMethod || '';
          accountNumber = formFields.accountNumber || '';
          paymentReceivedDate = formFields.paymentReceivedDate || '';
          personName = formFields.personName || '';
        }
        return {
          service: serviceTitle,
          serviceType: serviceTitle,
          name: personal.name || '',
          phone: personal.phone || '',
          totalPayment: fixedPrice,
          currentReceivingPayment,
          remainingAmount,
          paymentMethod,
          accountNumber,
          paymentReceivedDate,
          personName,
          _id: row._id,
          type: 'processing',
        };
      }
      return {};
    }

    let mapConverted, mapManual, mapProcessing;
    try {
      mapConverted = converted.map(row => extractFields(row, 'converted'));
      mapManual = manual.map(row => extractFields(row, 'manual'));
      mapProcessing = processing.map(row => extractFields(row, 'processing'));
    } catch (mapErr) {
      console.error('Mapping error:', mapErr);
      return res.status(500).json({ error: 'Mapping error in /accounts/services-stats', details: mapErr.message, stack: mapErr.stack });
    }

    res.json({
      converted: mapConverted,
      manual: mapManual,
      processing: mapProcessing
    });
  } catch (err) {
    console.error('Data fetch/map error:', err);
    res.status(500).json({ error: 'Failed to fetch all services data', details: err.message, stack: err.stack });
  }
});
// Delete a payment for ConvertedLead or ManualServiceSubmission
router.delete('/add-payment/:type/:id/:paymentIdx', async (req, res) => {
  try {
    const { type, id, paymentIdx } = req.params;
    let doc;
    if (type === 'converted') {
      doc = await ConvertedLead.findById(id);
    } else if (type === 'manual') {
      doc = await ManualServiceSubmission.findById(id);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!Array.isArray(doc.payments) || doc.payments.length <= paymentIdx) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    // Remove payment
    doc.payments.splice(paymentIdx, 1);
    // Update pricing summary
    let totalPaid = doc.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (doc.pricing) {
      // Use last payment for method/person/date if exists
      const last = doc.payments.length > 0 ? doc.payments[doc.payments.length-1] : {};
      doc.pricing.currentReceivingPayment = totalPaid;
      doc.pricing.remainingAmount = Math.max((doc.pricing.totalPayment || 0) - totalPaid, 0);
      doc.pricing.paymentMethod = last.method || '';
      doc.pricing.accountNumber = last.accountNumber || '';
      doc.pricing.personName = last.personName || '';
      doc.pricing.paymentReceivedDate = last.date || '';
    }
    await doc.save();
    res.json({ success: true, payments: doc.payments, pricing: doc.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment', details: err.message });
  }
});
// Edit a payment for ConvertedLead or ManualServiceSubmission
router.patch('/add-payment/:type/:id/:paymentIdx', async (req, res) => {
  try {
    const { type, id, paymentIdx } = req.params;
    const paymentData = req.body;
    let doc;
    if (type === 'converted') {
      doc = await ConvertedLead.findById(id);
    } else if (type === 'manual') {
      doc = await ManualServiceSubmission.findById(id);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!Array.isArray(doc.payments) || doc.payments.length <= paymentIdx) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    // Update payment fields
    const payment = doc.payments[paymentIdx];
    if (typeof paymentData.amount !== 'undefined') payment.amount = paymentData.amount;
    if (typeof paymentData.date !== 'undefined') payment.date = paymentData.date;
    if (typeof paymentData.method !== 'undefined') payment.method = paymentData.method;
    if (typeof paymentData.accountNumber !== 'undefined') payment.accountNumber = paymentData.accountNumber;
    if (typeof paymentData.personName !== 'undefined') payment.personName = paymentData.personName;
    if (typeof paymentData.remarks !== 'undefined') payment.remarks = paymentData.remarks;
    if (typeof paymentData.document !== 'undefined') payment.document = paymentData.document;
    // Update pricing summary
    let totalPaid = doc.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (doc.pricing) {
      if (typeof paymentData.totalPayment !== 'undefined' && paymentData.totalPayment !== null && paymentData.totalPayment !== '') {
        doc.pricing.totalPayment = Number(paymentData.totalPayment);
      }
      doc.pricing.currentReceivingPayment = totalPaid;
      doc.pricing.remainingAmount = Math.max((doc.pricing.totalPayment || 0) - totalPaid, 0);
      doc.pricing.paymentMethod = payment.method;
      doc.pricing.accountNumber = payment.accountNumber;
      doc.pricing.personName = payment.personName;
      doc.pricing.paymentReceivedDate = payment.date;
    }
    await doc.save();
    res.json({ success: true, payments: doc.payments, pricing: doc.pricing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit payment', details: err.message });
  }
});
// GET single Account (dynamic route must be last)
router.get('/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).populate('user service lead');
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});
// UPDATE Account
router.put('/:id', async (req, res) => {
  try {
    const { totalPrice, advancePayment, remainingPayment, paymentStatus } = req.body;
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { totalPrice, advancePayment, remainingPayment, paymentStatus },
      { new: true }
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});
// DELETE Account
router.delete('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});
export default router;