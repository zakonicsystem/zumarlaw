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
    tasks: [String],
    login: {
        email: String,
        password: String
    }
}, { timestamps: true });

export default mongoose.model('Roles', roleSchema);
