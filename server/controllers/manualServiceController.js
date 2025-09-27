// Edit a specific payment for a manual service submission
export const editPaymentForManualService = async (id, paymentIdx, paymentData) => {
  const submission = await ManualServiceSubmission.findById(id);
  if (!submission || !Array.isArray(submission.payments) || submission.payments.length <= paymentIdx) return null;
  const payment = submission.payments[paymentIdx];
  if (typeof paymentData.amount !== 'undefined') payment.amount = paymentData.amount;
  if (typeof paymentData.date !== 'undefined') payment.date = paymentData.date;
  if (typeof paymentData.method !== 'undefined') payment.method = paymentData.method;
  if (typeof paymentData.accountNumber !== 'undefined') payment.accountNumber = paymentData.accountNumber;
  if (typeof paymentData.personName !== 'undefined') payment.personName = paymentData.personName;
  if (typeof paymentData.remarks !== 'undefined') payment.remarks = paymentData.remarks;
  // Update label if needed
  payment.label = payment.label || (paymentIdx == 0 ? 'First Payment' : paymentIdx == 1 ? 'Second Payment' : `Payment ${Number(paymentIdx) + 1}`);
  // Update pricing summary
  const totalPaid = submission.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  if (submission.pricing) {
    submission.pricing.currentReceivingPayment = totalPaid;
    submission.pricing.remainingAmount = Math.max((submission.pricing.totalPayment || 0) - totalPaid, 0);
    submission.pricing.paymentMethod = payment.method;
    submission.pricing.accountNumber = payment.accountNumber;
    submission.pricing.personName = payment.personName;
    submission.pricing.paymentReceivedDate = payment.date;
  }
  await submission.save();
  return submission;
};

// Delete a specific payment for a manual service submission
export const deletePaymentForManualService = async (id, paymentIdx) => {
  const submission = await ManualServiceSubmission.findById(id);
  if (!submission || !Array.isArray(submission.payments) || submission.payments.length <= paymentIdx) return null;
  submission.payments.splice(paymentIdx, 1);
  // Update labels for remaining payments
  submission.payments.forEach((p, idx) => {
    p.label = idx === 0 ? 'First Payment' : idx === 1 ? 'Second Payment' : `Payment ${idx + 1}`;
  });
  // Update pricing summary
  const totalPaid = submission.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const last = submission.payments.length > 0 ? submission.payments[submission.payments.length-1] : {};
  if (submission.pricing) {
    submission.pricing.currentReceivingPayment = totalPaid;
    submission.pricing.remainingAmount = Math.max((submission.pricing.totalPayment || 0) - totalPaid, 0);
    submission.pricing.paymentMethod = last.method || '';
    submission.pricing.accountNumber = last.accountNumber || '';
    submission.pricing.personName = last.personName || '';
    submission.pricing.paymentReceivedDate = last.date || '';
  }
  await submission.save();
  return submission;
};
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';



// Add a payment to a manual service submission
export const addPaymentToManualService = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, method, accountNumber, personName, remarks } = req.body;
    const submission = await ManualServiceSubmission.findById(id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    submission.payments = submission.payments || [];
    // First payment is from creation (submission.pricing.currentReceivingPayment)
    // Subsequent payments are added here
    let label = 'Second Payment';
    if (submission.payments.length === 1) label = 'Third Payment';
    else if (submission.payments.length > 1) label = `Payment ${submission.payments.length + 2}`;
  submission.payments.push({ amount, date, method, accountNumber, personName, remarks, label });
    // Calculate total received: sum of all payments in payments array
    const totalPaid = submission.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (submission.pricing) {
      submission.pricing.currentReceivingPayment = totalPaid;
      submission.pricing.remainingAmount = Math.max((submission.pricing.totalPayment || 0) - totalPaid, 0);
    }
    await submission.save();
    res.json({ success: true, payments: submission.payments, pricing: submission.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all payments for a manual service submission
export const getPaymentsForManualService = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await ManualServiceSubmission.findById(id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.json({ payments: submission.payments || [], currentReceivingPayment: submission.currentReceivingPayment, remainingAmount: submission.remainingAmount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete many manual service submissions by IDs
export const deleteManyManualServices = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    await ManualServiceSubmission.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Selected services deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete selected services' });
  }
};
