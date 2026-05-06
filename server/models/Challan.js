import mongoose from 'mongoose';

const challanSchema = new mongoose.Schema(
  {
    // Reference to the service (can be from any source)
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'serviceSource',
      index: true,
    },
    // Track which model serviceId refers to
    serviceSource: {
      type: String,
      enum: ['ServiceDetail', 'ManualServiceSubmission', 'ConvertedLead'],
      required: true,
    },
    // Service details snapshot
    serviceName: String,
    serviceType: String,
    clientName: String,
    clientPhone: String,
    
    // Challan Fees
    challanFee: {
      amount: { type: Number, default: 0 },
      addedAt: Date,
      description: String,
    },
    
    // Consultancy Fees
    consultancyFee: {
      amount: { type: Number, default: 0 },
      addedAt: Date,
      description: String,
    },
    
    // Total fees (for quick calculation)
    totalFees: {
      type: Number,
      default: 0,
    },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
    },
    
    // Notes
    remarks: String,
    
    // Admin who added/edited
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate total fees
challanSchema.pre('save', function (next) {
  this.totalFees = (this.challanFee?.amount || 0) + (this.consultancyFee?.amount || 0);
  next();
});

// Index for quick lookups
challanSchema.index({ serviceId: 1, serviceSource: 1 });

export default mongoose.model('Challan', challanSchema);
