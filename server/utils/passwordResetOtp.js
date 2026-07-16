import bcrypt from 'bcrypt';
import crypto from 'crypto';
import PasswordResetOtp from '../models/PasswordResetOtp.js';
import { createEmailTransporter, getEmailFrom } from './emailTransporter.js';

const OTP_TTL_MINUTES = 10;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const sendPasswordResetOtp = async ({ email, accountType }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await PasswordResetOtp.deleteMany({ email: normalizedEmail, accountType, usedAt: null });
  await PasswordResetOtp.create({ email: normalizedEmail, accountType, otpHash, expiresAt });

  const transporter = createEmailTransporter();
  await transporter.sendMail({
    from: getEmailFrom(),
    to: normalizedEmail,
    subject: 'Password Reset OTP',
    text: `Your OTP for Password Forget is ${otp}. For Security Purposes.\nNoted : Please do not share your OTP with anyone.`,
    html: `<p>Your OTP for Password Forget is <strong>${otp}</strong>. For Security Purposes.</p><p>Noted : Please do not share your OTP with anyone.</p>`
  });
};

export const verifyPasswordResetOtp = async ({ email, accountType, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  const code = String(otp || '').trim();
  if (!normalizedEmail || !code) return false;

  const record = await PasswordResetOtp.findOne({
    email: normalizedEmail,
    accountType,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!record) return false;

  const matches = await bcrypt.compare(code, record.otpHash);
  if (!matches) return false;

  record.usedAt = new Date();
  await record.save();
  return true;
};
