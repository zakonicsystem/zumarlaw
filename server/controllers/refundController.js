import Refund from '../models/Refund.js';
import path from 'path';
import fs from 'fs';

// Create a refund submission from the two-step wizard
export const createRefund = async (req, res) => {
  try {
    const user = req.user || null;

    // Extract data from form submission (both steps combined)
    const {
      // Step 1: Case Closure
      name, cnic, phone, email, caseType, caseSubmitDate, consultantName, caseCloseReason,
      tAndCAccepted: step1TAndC, undertakingAccepted: step1Undertaking, undertakingApproved: step1UndertakingApproved,
      // Step 2: Refund Details
      totalCasePayment, paidPaymentType, paidPayment, receiverAccountNo,
      bankName, accountTitle, accountNo, ibanNo,
      refundPolicyAccepted, undertakingAccepted: step2Undertaking, undertakingApproved: step2UndertakingApproved
    } = req.body;

    // Validate required Step 1 fields
    if (!name || !cnic || !phone || !email || !caseType || !consultantName || !caseCloseReason) {
      return res.status(400).json({ error: 'All case closure details are required' });
    }

    // Build refund doc - allow creating with only Step 1 (case closure).
    const refund = new Refund({
      caseClosure: {
        name: name?.trim(),
        cnic: cnic?.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        caseType: caseType?.trim(),
        caseSubmitDate: caseSubmitDate ? new Date(caseSubmitDate) : undefined,
        consultantName: consultantName?.trim(),
        caseCloseReason: caseCloseReason?.trim(),
        tAndCAccepted: step1TAndC === 'true' || step1TAndC === true,
        undertakingAccepted: step1Undertaking === 'true' || step1Undertaking === true,
        undertakingApproved: step1UndertakingApproved === 'true' || step1UndertakingApproved === true
      },
      status: 'pending',
      createdBy: user ? user.id : undefined,
      createdByRole: user ? user.role : 'Anonymous'
    });

    // If Step 2 data is present, attach it (support both multipart/form-data and JSON)
    const hasStep2 = totalCasePayment || paidPayment || bankName || accountNo || ibanNo;
    if (hasStep2) {
      // Validate required Step 2 fields
      if (!totalCasePayment || !paidPaymentType || !paidPayment || !receiverAccountNo || !bankName || !accountTitle || !accountNo || !ibanNo) {
        return res.status(400).json({ error: 'All refund details are required' });
      }
      if (!refundPolicyAccepted || !step2Undertaking) {
        return res.status(400).json({ error: 'All refund terms must be accepted' });
      }

      refund.refundDetails = {
        totalCasePayment: parseFloat(totalCasePayment),
        paidPaymentType: paidPaymentType?.trim(),
        paidPayment: parseFloat(paidPayment),
        receiverAccountNo: receiverAccountNo?.trim(),
        paymentEvidence: req.file ? path.join('uploads', req.file.filename).replace(/\\/g, '/') : undefined,
        bankName: bankName?.trim(),
        accountTitle: accountTitle?.trim(),
        accountNo: accountNo?.trim(),
        ibanNo: ibanNo?.trim(),
        refundPolicyAccepted: refundPolicyAccepted === 'true' || refundPolicyAccepted === true,
        undertakingAccepted: step2Undertaking === 'true' || step2Undertaking === true,
        undertakingApproved: step2UndertakingApproved === 'true' || step2UndertakingApproved === true
      };
    }

    await refund.save();
    res.status(201).json(refund);
  } catch (err) {
    console.error('createRefund error', err);
    res.status(500).json({ error: 'Failed to create refund request', details: err.message });
  }
};

export const getRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({})
      .populate('createdBy', 'email name role')
      .populate('processedBy', 'email name role')
      .sort({ createdAt: -1 });
    res.json(refunds);
  } catch (err) {
    console.error('getRefunds error', err);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
};

export const getRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const refund = await Refund.findById(id)
      .populate('createdBy', 'email name role')
      .populate('processedBy', 'email name role');
    if (!refund) return res.status(404).json({ error: 'Refund not found' });
    res.json(refund);
  } catch (err) {
    console.error('getRefund error', err);
    res.status(500).json({ error: 'Failed to fetch refund' });
  }
};

// Update refund status (admin only - requires valid JWT token and admin role)
export const updateRefundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = req.user;

    // Strict authentication check - user MUST be authenticated
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized. Admin authentication required. Please log in again.' });
    }

    // Role validation - only admins and employees can update refund status
    const validRoles = ['admin', 'employee'];
    if (!user.role || !validRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden. Only admins can update refund status.' });
    }

    // Validate status is one of the allowed values
    if (!['pending', 'approved', 'rejected', 'refunded', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed values: pending, approved, rejected, refunded, completed' });
    }

    // Set eligibility flag - user can add refund details when status is 'approved'
    const isEligibleForRefundDetails = status === 'approved';

    const refund = await Refund.findByIdAndUpdate(
      id,
      {
        status,
        notes: notes || undefined,
        processedBy: user.id,
        processedByRole: user.role,
        isEligibleForRefundDetails,
        processedAt: new Date()
      },
      { new: true }
    ).populate('createdBy', 'email name role').populate('processedBy', 'email name role');

    if (!refund) return res.status(404).json({ error: 'Refund not found' });

    console.log(`[Refund Status Updated] ID: ${id}, Status: ${status}, UpdatedBy: ${user.email} (${user.role})`);
    res.json(refund);
  } catch (err) {
    console.error('updateRefundStatus error', err);
    res.status(500).json({ error: 'Failed to update refund status' });
  }
};

export const deleteRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Refund.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Refund not found' });

    // If evidence file exists, try to remove it from disk
    if (deleted.refundDetails?.paymentEvidence) {
      try {
        const absPath = path.isAbsolute(deleted.refundDetails.paymentEvidence)
          ? deleted.refundDetails.paymentEvidence
          : path.join(process.cwd(), deleted.refundDetails.paymentEvidence);
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
        }
      } catch (fsErr) {
        console.warn('Failed to remove evidence file for deleted refund:', fsErr);
      }
    }

    res.json({ success: true, message: 'Refund deleted' });
  } catch (err) {
    console.error('deleteRefund error', err);
    res.status(500).json({ error: 'Failed to delete refund' });
  }
};

// Update refund details (user adds refund details after admin approval)
export const updateRefundDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const { totalCasePayment, paidPaymentType, paidPayment, receiverAccountNo, bankName, accountTitle, accountNo, ibanNo, refundPolicyAccepted, undertakingAccepted, undertakingApproved } = req.body;

    // Basic validation
    if (!totalCasePayment || !paidPaymentType || !paidPayment || !receiverAccountNo || !bankName || !accountTitle || !accountNo || !ibanNo) {
      return res.status(400).json({ error: 'All refund details are required' });
    }

    const existing = await Refund.findById(id);
    if (!existing) return res.status(404).json({ error: 'Refund not found' });

    // Only allow adding refund details if admin has approved the request
    if (existing.status !== 'approved' || !existing.isEligibleForRefundDetails) {
      return res.status(403).json({ error: 'Refund details cannot be added until the request is approved by an admin' });
    }

    const update = {
      refundDetails: {
        totalCasePayment: parseFloat(totalCasePayment),
        paidPaymentType: paidPaymentType?.trim(),
        paidPayment: parseFloat(paidPayment),
        receiverAccountNo: receiverAccountNo?.trim(),
        paymentEvidence: req.file ? path.join('uploads', req.file.filename).replace(/\\/g, '/') : existing.refundDetails?.paymentEvidence,
        bankName: bankName?.trim(),
        accountTitle: accountTitle?.trim(),
        accountNo: accountNo?.trim(),
        ibanNo: ibanNo?.trim(),
        refundPolicyAccepted: refundPolicyAccepted === 'true' || refundPolicyAccepted === true,
        undertakingAccepted: undertakingAccepted === 'true' || undertakingAccepted === true,
        undertakingApproved: undertakingApproved === 'true' || undertakingApproved === true
      }
    };

    const refund = await Refund.findByIdAndUpdate(id, update, { new: true });
    res.json(refund);
  } catch (err) {
    console.error('updateRefundDetails error', err);
    res.status(500).json({ error: 'Failed to update refund details' });
  }
};
