
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  method: { type: String, enum: ['Cash', 'Cheque', 'Bank', 'Easypaisa', 'Jazzcash'], required: false },
  accountNumber: { type: String },
  personName: { type: String },
  remarks: { type: String },
}, { _id: false });
// Sub-schema for file metadata (same as ConvertedLead)
const FileMetaSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  type: { type: String },
  mimetype: String,
  url: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const PricingSchema = new mongoose.Schema({
  totalPayment: { type: Number, required: false },
  currentReceivingPayment: { type: Number, required: false },
  remainingAmount: { type: Number, required: false },
  paymentMethod: { type: String, enum: ['Cash', 'Cheque', 'Bank', 'Easypaisa', 'Jazzcash'], required: false },
  accountNumber: { type: String, required: false },
  personName: { type: String, required: false },
  paymentReceivedDate: { type: Date, required: false },
}, { _id: false });

const ManualServiceSubmissionSchema = new mongoose.Schema({
  serviceType: { type: String, required: true },
  name: String,
  email: String,
  cnic: String,
  phone: String,
  pricing: { type: PricingSchema, default: {} }, // First payment and payment info
  otherPayments: [PricingSchema], // (legacy) Subsequent payments
  payments: [PaymentSchema], // If you need legacy payment records
  // Dynamic fields: store all submitted fields as a mixed object
  fields: { type: mongoose.Schema.Types.Mixed },
  cnicGroups: [
    {
      front: String, // file path
      back: String   // file path
    }
  ],
  certificate: { type: String },
  assignedTo: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  // Progress status represents granular case progress (e.g., under_review, challan_pending, incorporated, etc.)
  progressStatus: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ManualServiceSubmission', ManualServiceSubmissionSchema);
