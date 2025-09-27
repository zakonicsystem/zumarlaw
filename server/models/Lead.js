import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
    name: String,
    email: String,
    createdAt: { type: Date, default: Date.now },
    phone: String,
    status: String,
    service: { type: String },
    assigned: String,
    remarks: String
});

export default mongoose.model('Lead', LeadSchema);
