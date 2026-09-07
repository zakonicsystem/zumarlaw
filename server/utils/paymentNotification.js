import { enqueueNotification, notificationKey } from './notificationQueue.js';
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

  const jobs = [];
  if (resolvedUserId) jobs.push({ channel:'inapp', recipient:String(resolvedUserId), payload:{userId:resolvedUserId,serviceId:resolvedServiceId,type:'payment',message} });
  if (resolvedPhone) jobs.push({channel:'sms',recipient:resolvedPhone,payload:{message}});
  if (resolvedEmail) jobs.push({channel:'email',recipient:resolvedEmail,payload:buildPaymentInvoiceEmail({recipientName:resolvedName,serviceName:resolvedServiceName,referenceId:resolvedServiceId,...resolvePaymentInvoiceAmounts(doc)})});
  for(const job of jobs) {
    await enqueueNotification({...job,key:notificationKey(resolvedServiceId,previousPaid,amount,job.channel),serviceId:String(resolvedServiceId)});
  }
  return message;
};
