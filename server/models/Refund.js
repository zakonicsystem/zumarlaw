import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  // Step 1: Case Closure Details
  caseClosure: {
    name: { type: String, required: true },
    cnic: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    caseType: { type: String, required: true },
    caseSubmitDate: { type: Date },
    consultantName: { type: String },
    caseCloseReason: { type: String, required: true },
    tAndCAccepted: { type: Boolean, default: false },
    undertakingAccepted: { type: Boolean, default: false },
    undertakingApproved: { type: Boolean, default: false }
  },

  // Step 2: Refund Details
  refundDetails: {
    totalCasePayment: { type: Number },
    paidPaymentType: { type: String }, // check, cash, online, etc.
    paidPayment: { type: Number },
    receiverAccountNo: { type: String },
    paymentEvidence: { type: String }, // path to uploaded file
    bankName: { type: String },
    accountTitle: { type: String },
    accountNo: { type: String },
    ibanNo: { type: String },
    refundPolicyAccepted: { type: Boolean, default: false },
    undertakingAccepted: { type: Boolean, default: false },
    undertakingApproved: { type: Boolean, default: false }
  },

  // Metadata
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'refunded', 'completed'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles' },
  processedByRole: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles' },
  createdByRole: { type: String },
  notes: { type: String }
  ,isEligibleForRefundDetails: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Refund', refundSchema);
