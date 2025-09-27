
import mongoose from 'mongoose';


// Sub-schema for file metadata
const FileMetaSchema = new mongoose.Schema({
  filename: String, // stored filename (with extension)
  originalName: String, // original uploaded name
  type: { type: String }, // 'image' or 'document'
  mimetype: String, // e.g. 'image/png', 'application/pdf'
  url: String, // path or URL to file
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });
const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  method: { type: String, enum: ['Cash', 'Cheque', 'Bank', 'Easypaisa', 'Jazzcash'], required: false },
  accountNumber: { type: String },
  personName: { type: String },
  remarks: { type: String },
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

const ConvertedLeadSchema = new mongoose.Schema({
  // Basic lead info
  name: String,
  phone: String,
  email: String,
  assigned: { type: String, default: '' },
  service: String,
  status: { type: String, enum: ['pending', 'processing', 'converted', 'completed', 'Follow-up', 'Mature', 'Contacted'], default: 'converted' },
  // Dynamic fields
  fields: { type: Object, default: {} },
  // File uploads (store file names/paths)
  files: { type: Object, default: {} },
  // New: Document files (pdf, doc, docx, etc.)
  docs: [FileMetaSchema],
  certificate: { type: String },
  pricing: { type: PricingSchema, default: {} },
  payments: [PaymentSchema],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('ConvertedLead', ConvertedLeadSchema);
