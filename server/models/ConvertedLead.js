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

const ConvertedLeadSchema = new mongoose.Schema({
  // Basic lead info
  name: String,
  phone: String,
  email: String,
  assigned: { type: String, default: '' },
  service: String,
  price: { type: Number }, // Added price field
  status: { type: String, enum: ['pending', 'processing', 'converted', 'completed', 'Follow-up', 'Mature', 'Contacted'], default: 'converted' },
  // Dynamic fields
  fields: { type: Object, default: {} },
  // File uploads (store file names/paths)
  files: { type: Object, default: {} },
  // New: Document files (pdf, doc, docx, etc.)
  docs: [FileMetaSchema],
  // Certificate file (single file, e.g. PDF or image)
  certificate: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ConvertedLead', ConvertedLeadSchema);
