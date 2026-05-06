import mongoose from 'mongoose';



const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  method: { type: String, enum: ['Cash', 'Cheque', 'Bank', 'Easypaisa', 'Jazzcash'], required: false },
  accountNumber: { type: String },
  personName: { type: String },
  remarks: { type: String },
  label: { type: String },
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

const ServiceDetailSchema = new mongoose.Schema({
  serviceTitle: String,
  formFields: Object,
  personalId: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalDetail' },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'], 
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'advance', 'full'],
    default: 'pending'
  },
  assignedTo: {
    type: String,
    default: ''
  },
  // Granular progress status for admin workflow steps
  progressStatus: { type: String, default: '' },
  certificate: { type: String, default: null },
  invoiceSent: { type: Boolean, default: false },
  payments: [PaymentSchema],
  pricing: { type: PricingSchema, default: {} },
  // Merge tracking
  mergedIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceDetail' }],
  mergedCount: { type: Number, default: 0 },
  primaryName: { type: String }, // Used when service is merged
  mergedAt: { type: Date },
  secondaryBackup: [{ type: mongoose.Schema.Types.Mixed }], // Store backup of secondary services for restore on unmerge
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ServiceDetail', ServiceDetailSchema);
