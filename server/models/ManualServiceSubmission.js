import mongoose from 'mongoose';

const ManualServiceSubmissionSchema = new mongoose.Schema({
  serviceType: { type: String, required: true },
  name: String,
  email: String,
  cnic: String,
  phone: String,
  price: { type: Number }, // Added price field
  // Dynamic fields: store all submitted fields as a mixed object
  fields: { type: mongoose.Schema.Types.Mixed },
  // CNIC groups (for dynamic member CNICs)
  cnicGroups: [
    {
      front: String, // file path
      back: String   // file path
    }
  ],
  certificate: { type: String },
  assignedTo: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ManualServiceSubmission', ManualServiceSubmissionSchema);
