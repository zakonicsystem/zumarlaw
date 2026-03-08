import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './models/Admin.js';

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // First Admin
        const existingAdmin1 = await Admin.findOne({ email: 'admin@zumarlawfirm.com' });
        if (!existingAdmin1) {
            const hashedPassword1 = await bcrypt.hash('zumarlawfirm@7806', 10);
            const admin1 = new Admin({
                email: 'admin@zumarlawfirm.com',
                password: hashedPassword1,
            });
            await admin1.save();
            console.log('First Admin created: admin@zumarlawfirm.com');
        } else {
            console.log('First Admin already exists');
        }

        // Second Admin
        const existingAdmin2 = await Admin.findOne({ email: 'zakonics@gmail.com' });
        if (!existingAdmin2) {
            const hashedPassword2 = await bcrypt.hash('zakonics121212', 10);
            const admin2 = new Admin({
                email: 'zakonics@gmail.com',
                password: hashedPassword2,
            });
            await admin2.save();
            console.log('Second Admin created: zakonics@gmail.com');
        } else {
            console.log('Second Admin already exists');
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAdmin();
