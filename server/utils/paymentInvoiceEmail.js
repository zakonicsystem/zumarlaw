import { buildBrandedEmail, escapeEmailHtml } from './brandedEmail.js';

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

const formatAmount = (value) => `Rs. ${toAmount(value).toLocaleString('en-PK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})}`;

export const resolvePaymentInvoiceAmounts = (record = {}) => {
  const pricing = record.pricing || {};
  const totalAmount = toAmount(
    pricing.totalPayment ?? record.totalPayment ?? record.totalPrice ?? record.price
  );
  const paymentsTotal = Array.isArray(record.payments)
    ? record.payments.reduce((sum, payment) => sum + toAmount(payment?.amount), 0)
    : 0;
  const recordedPaid = toAmount(
    pricing.currentReceivingPayment ?? record.currentReceivingPayment ?? record.paidAmount
  );
  const storedRemaining = pricing.remainingAmount ?? record.remainingAmount;
  const inferredPaid = totalAmount > 0 && storedRemaining !== undefined && storedRemaining !== null
    ? Math.max(totalAmount - toAmount(storedRemaining), 0)
    : 0;
  const paidAmount = Math.max(paymentsTotal, recordedPaid, inferredPaid);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  return {
    totalAmount,
    paidAmount: totalAmount > 0 ? Math.min(paidAmount, totalAmount) : paidAmount,
    remainingAmount,
    isCompleted: totalAmount > 0 && remainingAmount <= 0,
  };
};

export const buildPaymentInvoiceEmail = ({
  recipientName,
  serviceName,
  referenceId,
  totalAmount,
  paidAmount,
  remainingAmount,
  isCompleted,
}) => {
  const name = String(recipientName || '').trim() || 'Valued Client';
  const service = String(serviceName || '').trim() || 'Requested Service';
  const reference = String(referenceId || '').trim() || 'N/A';
  const paymentLabel = isCompleted ? 'Completed' : 'Payment Pending';
  const statusColor = isCompleted ? '#166534' : '#9a6700';
  const statusBackground = isCompleted ? '#dcfce7' : '#fff8e1';

  return buildBrandedEmail({
    subject: `Payment Invoice for ${service}`,
    title: 'Payment Invoice',
    preheader: `${paymentLabel}: ${formatAmount(paidAmount)} paid, ${formatAmount(remainingAmount)} remaining.`,
    greeting: `Dear ${name},`,
    contentText: `Please find your payment summary below.\n\nService: ${service}\nInvoice Reference: ${reference}\nTotal Amount: ${formatAmount(totalAmount)}\nPaid Amount: ${formatAmount(paidAmount)}\nRemaining Amount: ${formatAmount(remainingAmount)}\nPayment Status: ${paymentLabel}`,
    contentHtml: `
      <p style="margin:0 0 20px; font-size:15px; line-height:25px; color:#263442;">Please find your payment summary below.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px; border-collapse:separate; border-spacing:0; border:1px solid #eadfe6; border-radius:8px; overflow:hidden;">
        <tr>
          <td style="padding:13px 16px; background-color:#fbf5f9; border-bottom:1px solid #eadfe6; font-size:13px; color:#6b5664;">Service</td>
          <td align="right" style="padding:13px 16px; background-color:#fbf5f9; border-bottom:1px solid #eadfe6; font-size:13px; font-weight:bold; color:#57123f;">${escapeEmailHtml(service)}</td>
        </tr>
        <tr>
          <td style="padding:13px 16px; border-bottom:1px solid #edf0f2; font-size:13px; color:#6b7785;">Invoice Reference</td>
          <td align="right" style="padding:13px 16px; border-bottom:1px solid #edf0f2; font-size:13px; font-weight:bold; color:#263442;">${escapeEmailHtml(reference)}</td>
        </tr>
        <tr>
          <td style="padding:13px 16px; border-bottom:1px solid #edf0f2; font-size:13px; color:#6b7785;">Total Amount</td>
          <td align="right" style="padding:13px 16px; border-bottom:1px solid #edf0f2; font-size:15px; font-weight:bold; color:#263442;">${formatAmount(totalAmount)}</td>
        </tr>
        <tr>
          <td style="padding:13px 16px; border-bottom:1px solid #edf0f2; font-size:13px; color:#6b7785;">Paid Amount</td>
          <td align="right" style="padding:13px 16px; border-bottom:1px solid #edf0f2; font-size:15px; font-weight:bold; color:#166534;">${formatAmount(paidAmount)}</td>
        </tr>
        <tr>
          <td style="padding:13px 16px; font-size:13px; color:#6b7785;">Remaining Amount</td>
          <td align="right" style="padding:13px 16px; font-size:15px; font-weight:bold; color:#b42318;">${formatAmount(remainingAmount)}</td>
        </tr>
      </table>
      <div style="padding:14px 16px; background-color:${statusBackground}; border-radius:6px; text-align:center; font-size:14px; line-height:20px; font-weight:bold; color:${statusColor};">Payment Status: ${paymentLabel}</div>`,
    signatureTitle: 'Accounts Department',
  });
};
