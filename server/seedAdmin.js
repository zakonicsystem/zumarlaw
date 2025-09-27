import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './models/Admin.js';

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);


        const existingAdmin = await Admin.findOne({ email: 'admin@zumarlawfirm.com' });
        if (existingAdmin) {
            console.log('Admin already exists');
            return process.exit();
        }

        const hashedPassword = await bcrypt.hash('zumarlaw123321', 10);

        const admin = new Admin({
            email: 'admin@zumarlawfirm.com',
            password: hashedPassword,
        });

        await admin.save();
        console.log('Admin created');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAdmin();
