import mongoose from 'mongoose';
const roleSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
    cnic: String,
    role: String,
    salary: String,
    branch: String,
    assignedPages: [String],
    canViewAllLeadsAndServices: {
        type: Boolean,
        default: false
    },
    canViewAllLeads: {
        type: Boolean,
        default: false
    },
    canViewAllServices: {
        type: Boolean,
        default: false
    },
    tasks: [String],
    employmentStatus: {
        type: String,
        enum: ['active', 'terminated'],
        default: 'active'
    },
    terminatedAt: {
        type: Date,
        default: null
    },
    terminatedReason: {
        type: String,
        default: ''
    },
    login: {
        email: String,
        password: String
    }
}, { timestamps: true });

export default mongoose.model('Roles', roleSchema);
