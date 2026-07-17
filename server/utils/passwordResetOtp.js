import bcrypt from 'bcrypt';
import crypto from 'crypto';
import PasswordResetOtp from '../models/PasswordResetOtp.js';
import { createEmailTransporter, getEmailFrom } from './emailTransporter.js';
import { buildBrandedEmail, getBrandedEmailLogoAttachment } from './brandedEmail.js';

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
  const accountLabel = accountType === 'admin' ? 'Administrator' : 'Employee';
  const emailContent = buildBrandedEmail({
    subject: 'Your Zumar Law Firm Password Reset Code',
    title: 'Password Reset Verification',
    preheader: `Your password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    greeting: `Dear ${accountLabel},`,
    contentText: `We received a request to reset your Zumar Law Firm account password.\n\nYour one-time verification code is: ${otp}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes. Do not share this code with anyone. If you did not request a password reset, you can safely ignore this email.`,
    contentHtml: `
      <p style="margin:0 0 20px; font-size:15px; line-height:25px; color:#263442;">We received a request to reset your Zumar Law Firm account password. Use the verification code below to continue.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td align="center" style="padding:22px 18px; background-color:#fbf5f9; border:1px solid #ead6e3; border-left:4px solid #57123f; border-radius:8px;">
            <div style="font-size:11px; line-height:16px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:#7a526c;">One-Time Verification Code</div>
            <div style="margin-top:8px; font-family:'Courier New', monospace; font-size:34px; line-height:42px; font-weight:bold; letter-spacing:8px; color:#57123f;">${otp}</div>
            <div style="margin-top:7px; font-size:12px; line-height:18px; color:#6b7785;">Expires in ${OTP_TTL_MINUTES} minutes</div>
          </td>
        </tr>
      </table>
      <div style="padding:14px 16px; background-color:#fff8e8; border:1px solid #f1dfad; border-radius:6px; font-size:13px; line-height:21px; color:#6b5521;"><strong>Security notice:</strong> Never share this code with anyone. Zumar Law Firm staff will never ask you for your verification code. If you did not request a password reset, you can safely ignore this email.</div>`,
    signatureTitle: 'Account Security Team',
  });
  await transporter.sendMail({
    from: getEmailFrom(),
    to: normalizedEmail,
    ...emailContent,
    attachments: [getBrandedEmailLogoAttachment()],
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
