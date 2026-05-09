import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
    name: String,
    email: String,
    createdAt: { type: Date, default: Date.now },
    phone: String,
    status: String,
    statusChangedAt: { type: Date, default: Date.now },
    service: { type: String },
    assigned: String,
    remarks: String,
    referralName: String,
    referralPhone: String,
    autoFollowUpAt: Date,
    followUps: [
        {
            employeeName: String,
            customerReport: String,
            nextFollowUpAt: Date,
            createdAt: { type: Date, default: Date.now }
        }
    ],
    refusedAt: Date
});

export default mongoose.model('Lead', LeadSchema);
