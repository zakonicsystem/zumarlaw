import nodemailer from 'nodemailer';

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

export const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not configured');
  }

  const port = Number(process.env.EMAIL_PORT || 465);

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port,
    secure: parseBoolean(process.env.EMAIL_SECURE, port === 465),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const getEmailFrom = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;
