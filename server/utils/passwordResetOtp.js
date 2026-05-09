import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PasswordResetOtp from '../models/PasswordResetOtp.js';

const OTP_TTL_MINUTES = 10;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not configured');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const sendPasswordResetOtp = async ({ email, accountType }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await PasswordResetOtp.deleteMany({ email: normalizedEmail, accountType, usedAt: null });
  await PasswordResetOtp.create({ email: normalizedEmail, accountType, otpHash, expiresAt });

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: normalizedEmail,
    subject: 'Password Reset OTP',
    text: `Your password reset OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: `<p>Your password reset OTP is <strong>${otp}</strong>.</p><p>It expires in ${OTP_TTL_MINUTES} minutes.</p>`
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
