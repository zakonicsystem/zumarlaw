import crypto from 'crypto';
import { createEmailTransporter, getEmailFrom } from './emailTransporter.js';
export async function sendEmployeeSetup(employee) {
  const token = crypto.randomBytes(32).toString('hex');
  employee.setupTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  employee.setupExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await employee.save();
  const link = (process.env.CLIENT_URL || '').replace(/\/$/, '') + '/employee-setup?token=' + token;
  const transporter = createEmailTransporter();
  try { await transporter.sendMail({ from: getEmailFrom(), to: employee.login.email,
    subject: 'Set up your Zumar Law Firm employee account',
    text: 'Set your password using this single-use link. It expires in 24 hours.\n\n' + link }); }
  finally { transporter.close(); }
}
