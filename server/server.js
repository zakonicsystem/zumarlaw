import autoSalaryRoutes from './routes/autoSalary.js';
// ✅ MUST BE FIRST - Load environment variables before anything else
import dotenv from 'dotenv';
dotenv.config();

// Global test route to verify server health
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import accountsRouter from './routes/accounts.js';
import serviceMessageRoutes from './routes/serviceMessage.js';
import expenseRouter from './routes/expense.js';
import announcementsRouter from './routes/announcements.js';
import session from 'express-session';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/userRoutes.js';
import cookieParser from 'cookie-parser';
import invoiceRoutes from './routes/ServiceRoutes.js';
import roleRoutes from './routes/roles.routes.js'; // make sure to add `.js` here
import employeeRoutes from './routes/employee.routes.js';
import employeeAuthRoutes from './routes/employeeAuth.js';
import userPanelRoutes from './routes/userpanel.routes.js';
import payrollsRoutes from './routes/payrolls.js';
import payrollDropdownsRoutes from './routes/payrollDropdowns.js';
import leadsRoutes from './routes/leads.js'; // Import leads routes
import adminServiceRoutes from './routes/adminServices.js';
import adminStatsRoutes from './routes/adminStats.js'
import manualServiceRoutes from './routes/manualService.js';
import convertedServiceRoutes from './routes/convertedService.js';
import adminServiceStats from './routes/adminServiceStats.js'; // Import the new route
import latestCompletedServices from './routes/latestCompletedServices.js';
import attendanceRoutes from './routes/attendance.js';
import challanRoutes from './routes/challans.js';
import refundRoutes from './routes/refund.js';
import smsRoutes from './routes/sms.js';
import formsRoutes from './routes/forms.js';
import mergeConvertedLeadsRoutes from './routes/mergeConvertedLeads.js';
import mergeServiceRoutes from './routes/mergeService.js';

import './config/passport.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultSecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport middleware
app.use(passport.initialize());

// Announcements route
app.use('/api/announcements', announcementsRouter);
app.use(passport.session());
app.use('/api/admin', roleRoutes);

app.use(cookieParser());
app.use('/api/autoSalary', autoSalaryRoutes);
// Ensure uploads directory exists and serve it statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/api/admin', manualServiceRoutes);
app.use('/api/admin', adminServiceRoutes);
app.use('/api/serviceMessage', serviceMessageRoutes);
app.use('/api/employee-login', employeeRoutes);
app.use('/api', employeeAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', userRoutes);
app.use('/api/userpanel', userPanelRoutes); // ✅ Now your route is mounted correctly
app.use('/api', payrollDropdownsRoutes);
app.use('/api/payrolls', payrollsRoutes);
app.use('/api/leads', leadsRoutes); // Register leads routes

app.use('/api/manualService', manualServiceRoutes);
app.use('/api/admin/services/converted', convertedServiceRoutes);
app.use('/api/convertedService', convertedServiceRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminServiceStats); // Register the new route
app.use('/api/admin', latestCompletedServices); // Register the latestCompletedServices route
app.use('/api/challans', challanRoutes); // Register challan management routes
app.use('/api/accounts', accountsRouter);
app.use('/api/expense', expenseRouter);
app.use('/api/refund', refundRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/attendance', attendanceRoutes); // Register attendance routes
// Merge routes
app.use('/api/mergeConvertedLeads', mergeConvertedLeadsRoutes);
app.use('/api/mergeService', mergeServiceRoutes);
app.get('/test', (req, res) => res.json({ test: 'server ok' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// Connect MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

export default app;
