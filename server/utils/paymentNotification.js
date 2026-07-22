import ServiceMessage from '../models/Servicemessage.js';
import cpaas from '../services/cpaasService.js';
import { createEmailTransporter, getEmailFrom } from './emailTransporter.js';
import { getBrandedEmailLogoAttachment } from './brandedEmail.js';
import { buildPaymentInvoiceEmail, resolvePaymentInvoiceAmounts } from './paymentInvoiceEmail.js';

const formatAmount = (value) => {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export const buildPaymentMessage = ({ amount, totalPayment, previousPaid, serviceName }) => {
  const paidAmount = Number(amount || 0);
  const total = Number(totalPayment || 0);
  const before = Number(previousPaid || 0);
  const after = before + paidAmount;
  const service = serviceName || 'your service';

  if (total > 0 && after >= total) {
    if (before <= 0) {
      return `Dear Client,\nWe are pleased to confirm that the full payment of Rs. ${formatAmount(total)} for your ${service} case has been successfully received.`;
    }

    return `Dear Client,\nWe are pleased to inform you that the pending payment of Rs. ${formatAmount(paidAmount)} for your ${service} case has been successfully received by Zumar Law Firm.`;
  }

  if (total > 0) {
    return `Dear Client,\nWe are pleased to inform you that an amount of Rs. ${formatAmount(paidAmount)} has been successfully received out of the total Rs. ${formatAmount(total)} fee for your ${service} case.`;
  }

  return `Dear Client,\nWe are pleased to inform you that an amount of Rs. ${formatAmount(paidAmount)} for your ${service} case has been successfully received by Zumar Law Firm.`;
};

export const notifyPaymentReceived = async ({ doc, amount, previousPaid = 0, serviceName, phone, userId, serviceId }) => {
  const message = buildPaymentMessage({
    amount,
    totalPayment: doc?.pricing?.totalPayment,
    previousPaid,
    serviceName,
  });

  const resolvedUserId = userId || doc?.userId || doc?._id;
  const resolvedServiceId = serviceId || doc?._id;
  const resolvedPhone = phone || doc?.phone || doc?.personalId?.phone;
  const resolvedEmail = String(doc?.email || doc?.personalId?.email || '').trim();
  const resolvedName = String(doc?.name || doc?.personalId?.name || '').trim() || 'Valued Client';
  const resolvedServiceName = serviceName || doc?.service || doc?.serviceType || doc?.serviceTitle;

  try {
    if (resolvedUserId) {
      await ServiceMessage.create({
        userId: resolvedUserId,
        serviceId: resolvedServiceId,
        type: 'payment',
        message,
        createdAt: new Date(),
      });
    }

  } catch (err) {
    console.error('Payment in-app notification failed:', err.message);
  }

  try {
    if (resolvedPhone) {
      await cpaas.sendCustomSMS(resolvedPhone, message);
    }
  } catch (err) {
    console.error('Payment SMS notification failed:', err.message);
  }

  try {
    if (resolvedEmail) {
      const paymentSummary = resolvePaymentInvoiceAmounts(doc);
      const emailContent = buildPaymentInvoiceEmail({
        recipientName: resolvedName,
        serviceName: resolvedServiceName,
        referenceId: resolvedServiceId,
        ...paymentSummary,
      });
      const transporter = createEmailTransporter();
      await transporter.sendMail({
        from: getEmailFrom(),
        to: resolvedEmail,
        ...emailContent,
        attachments: [getBrandedEmailLogoAttachment()],
      });
    }
  } catch (err) {
    // The payment is already safely recorded. A mail-provider issue must not
    // roll it back or make the payment API return a failure.
    console.error('Payment email notification failed:', err.message);
  }

  return message;
};
