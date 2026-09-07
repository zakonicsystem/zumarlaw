import mongoose from 'mongoose';
const roleSchema = new mongoose.Schema({
    setupTokenHash: { type: String, select: false },
    setupExpiresAt: { type: Date, select: false },
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


roleSchema.set('toJSON', { transform(doc, ret) { delete ret.setupTokenHash; delete ret.setupExpiresAt; delete ret.password; delete ret.resetPasswordToken; delete ret.resetPasswordExpires; if (ret.login) delete ret.login.password; return ret; } });
export default mongoose.model('Roles', roleSchema);
