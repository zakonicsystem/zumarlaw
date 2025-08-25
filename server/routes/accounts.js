import express from 'express';
import Invoice from '../models/Invoice.js';
import Payroll from '../models/Payroll.js';
const router = express.Router();

// GET /accounts/summary - returns total revenue, pending amount, salary paid, profit, revenue by services, latest payrolls
router.get('/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    let serviceFilter = {};
    let manualFilter = {};
    let convertedFilter = {};
    let invoiceFilter = {};
    let payrollFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      serviceFilter.createdAt = { $gte: startDate, $lt: endDate };
      manualFilter.createdAt = { $gte: startDate, $lt: endDate };
      convertedFilter.createdAt = { $gte: startDate, $lt: endDate };
      invoiceFilter.createdAt = { $gte: startDate, $lt: endDate };
      payrollFilter.createdAt = { $gte: startDate, $lt: endDate };
    }

    // Import models
    const ServiceDetail = (await import('../models/Service.js')).default;
    const ManualServiceSubmission = (await import('../models/ManualServiceSubmission.js')).default;
    const ConvertedLead = (await import('../models/ConvertedLead.js')).default;

    // Get completed and pending services from all sources
    const completedServices = await ServiceDetail.find({ status: 'completed', ...serviceFilter });
    const pendingServices = await ServiceDetail.find({ status: 'pending', ...serviceFilter });
    const completedManual = await ManualServiceSubmission.find({ status: 'completed', ...manualFilter });
    const pendingManual = await ManualServiceSubmission.find({ status: 'pending', ...manualFilter });
    const completedConverted = await ConvertedLead.find({ status: 'completed', ...convertedFilter });
    const pendingConverted = await ConvertedLead.find({ status: 'pending', ...convertedFilter });

    // Use static prices from servicePrices.js
    const { servicePrices } = await import('../data/servicePrices.js');
    function getAmount(obj) {
      // Determine service title/type
      const title = obj.serviceTitle || obj.serviceType || obj.service || 'Other';
      // For ManualServiceSubmission and ConvertedLead, use price field if present
      if (typeof obj.price !== 'undefined') return Number(obj.price);
      // Use static price if available, else fallback to submitted paymentAmount
      if (servicePrices[title]) return Number(servicePrices[title]);
      if (obj.formFields && obj.formFields.paymentAmount) return Number(obj.formFields.paymentAmount);
      if (obj.fields && obj.fields.paymentAmount) return Number(obj.fields.paymentAmount);
      if (obj.fields && obj.fields.amount) return Number(obj.fields.amount);
      if (obj.paymentAmount) return Number(obj.paymentAmount);
      return 0;
    }

    // Revenue by services
    const revenueByServices = {};
    [...completedServices, ...completedManual, ...completedConverted].forEach(svc => {
      const title = svc.serviceTitle || svc.serviceType || svc.service || 'Other';
      const amount = getAmount(svc);
      if (!revenueByServices[title]) revenueByServices[title] = 0;
      revenueByServices[title] += amount;
    });

    // Total revenue and pending amount
    const totalRevenue = [...completedServices, ...completedManual, ...completedConverted].reduce((acc, svc) => acc + getAmount(svc), 0);
    // Only include services with status 'pending' for pendingAmount
    const pendingAmount = [...pendingServices, ...pendingManual, ...pendingConverted]
      .filter(svc => svc.status === 'pending')
      .reduce((acc, svc) => acc + getAmount(svc), 0);

    // Salary paid from payrolls
    const payrolls = await Payroll.find(payrollFilter).sort({ createdAt: -1 }).limit(2);
    const salaryPaid = payrolls.reduce((acc, p) => acc + (p.salary || 0), 0);
    // Profit
    const totalProfit = totalRevenue - salaryPaid;
    res.json({
      totalRevenue,
      pendingAmount,
      salaryPaid,
      totalProfit,
      revenueByServices,
      latestPayrolls: payrolls
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts summary' });
  }
});

export default router;
