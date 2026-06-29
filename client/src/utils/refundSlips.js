import jsPDF from 'jspdf';

export const caseClosureUndertaking =
  'I, do hereby solemnly affirm and declare that I have thoroughly read and understood the "Case Closure Policy" of Zumar Law Firm and am fully aware of all its terms and conditions. I, therefore, of my own free will and consent, hereby request Zumar Law Firm to proceed with the closure of my case based on the stated reasons. The Case Closure Request will be processed within five (5) working days.';

export const refundUndertaking =
  'I hereby confirm that I have read and understood the refund terms and conditions, and I accept that refunds will be processed only as per company and government rules, with 18% tax being non-refundable; requests will be valid only after case completion and payment confirmation, and once approved, the refund amount will be transferred to my provided account within five (5) working days.';

const primary = [87, 18, 63];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  const number = Number(value);
  return Number.isNaN(number) ? `Rs. ${value}` : `Rs. ${number.toLocaleString()}`;
};

const sanitizeFilePart = (value) =>
  String(value || 'customer')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'customer';

const createSlip = (title, subtitle) => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;

  pdf.setDrawColor(...primary);
  pdf.setLineWidth(2);
  pdf.rect(margin, 36, pageWidth - margin * 2, pageHeight - 72);

  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(19);
  pdf.setTextColor(...primary);
  pdf.text(title, pageWidth / 2, 66, { align: 'center' });

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(40, 40, 40);
  pdf.text('Zumar Law Firm', pageWidth / 2, 84, { align: 'center' });
  pdf.text(subtitle, pageWidth / 2, 100, { align: 'center' });

  pdf.setDrawColor(...primary);
  pdf.setLineWidth(1);
  pdf.line(margin + 18, 114, pageWidth - margin - 18, 114);

  return { pdf, y: 140, margin, pageWidth, pageHeight };
};

const ensurePage = (ctx, needed = 34) => {
  if (ctx.y + needed < ctx.pageHeight - 56) return;
  ctx.pdf.addPage();
  ctx.y = 56;
  ctx.pdf.setDrawColor(...primary);
  ctx.pdf.setLineWidth(2);
  ctx.pdf.rect(ctx.margin, 36, ctx.pageWidth - ctx.margin * 2, ctx.pageHeight - 72);
};

const addSection = (ctx, title) => {
  ensurePage(ctx, 28);
  const { pdf, margin, pageWidth } = ctx;
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(...primary);
  pdf.text(title, margin + 22, ctx.y);
  ctx.y += 8;
  pdf.setDrawColor(190, 190, 190);
  pdf.setLineWidth(0.6);
  pdf.line(margin + 22, ctx.y, pageWidth - margin - 22, ctx.y);
  ctx.y += 18;
};

const addRow = (ctx, label, value) => {
  const { pdf, margin, pageWidth } = ctx;
  const labelX = margin + 28;
  const valueX = margin + 190;
  const maxWidth = pageWidth - valueX - margin - 28;
  const text = String(value || 'N/A');
  const lines = pdf.splitTextToSize(text, maxWidth);
  const rowHeight = Math.max(18, lines.length * 12 + 4);
  ensurePage(ctx, rowHeight);

  pdf.setFontSize(10);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text(`${label}:`, labelX, ctx.y);

  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(40, 40, 40);
  pdf.text(lines, valueX, ctx.y);
  ctx.y += rowHeight;
};

const addUndertaking = (ctx, title, text, accepted) => {
  addSection(ctx, title);
  addRow(ctx, 'Undertaking Approved', accepted ? 'YES' : 'NO');

  if (!accepted) return;

  const { pdf, margin, pageWidth } = ctx;
  const x = margin + 28;
  const maxWidth = pageWidth - margin * 2 - 56;
  const lines = pdf.splitTextToSize(text, maxWidth);
  ensurePage(ctx, lines.length * 12 + 24);

  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(...primary);
  pdf.text('Complete Undertaking:', x, ctx.y);
  ctx.y += 16;
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(40, 40, 40);
  pdf.text(lines, x, ctx.y);
  ctx.y += lines.length * 12 + 10;
};

const finishSlip = (ctx, fileName) => {
  const { pdf, margin, pageWidth, pageHeight } = ctx;
  pdf.setFontSize(9);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('This is an official refund slip from Zumar Law Firm', pageWidth / 2, pageHeight - margin - 10, { align: 'center' });
  pdf.save(fileName);
};

export const generateCaseClosureSlip = (refundOrCaseClosure) => {
  const caseClosure = refundOrCaseClosure?.caseClosure || refundOrCaseClosure || {};
  const ctx = createSlip('CASE CLOSURE SLIP', `Date: ${formatDate(refundOrCaseClosure?.createdAt || new Date())}`);

  addSection(ctx, 'Case Closure Details');
  addRow(ctx, 'Name', caseClosure.name);
  addRow(ctx, 'CNIC', caseClosure.cnic);
  addRow(ctx, 'Phone', caseClosure.phone);
  addRow(ctx, 'Email', caseClosure.email);
  addRow(ctx, 'Case Type', caseClosure.caseType);
  addRow(ctx, 'Case Submit Date', formatDate(caseClosure.caseSubmitDate));
  addRow(ctx, 'Consultant Name', caseClosure.consultantName);
  addRow(ctx, 'Case Close Reason', caseClosure.caseCloseReason);
  addUndertaking(ctx, 'Case Closure Undertaking', caseClosureUndertaking, Boolean(caseClosure.undertakingApproved || caseClosure.undertakingAccepted));

  finishSlip(ctx, `case-closure-${sanitizeFilePart(caseClosure.name)}-${Date.now()}.pdf`);
};

export const generateRefundDetailsSlip = (refundOrDetails) => {
  const refundDetails = refundOrDetails?.refundDetails || refundOrDetails || {};
  const caseClosure = refundOrDetails?.caseClosure || {};
  const ctx = createSlip('ACCOUNT DETAILS SLIP', `Date: ${formatDate(refundOrDetails?.createdAt || new Date())}`);

  addSection(ctx, 'Refund Details');
  addRow(ctx, 'Customer Name', caseClosure.name);
  addRow(ctx, 'Total Case Payment', formatCurrency(refundDetails.totalCasePayment));
  addRow(ctx, 'Paid Payment Type', refundDetails.paidPaymentType);
  addRow(ctx, 'Paid Amount', formatCurrency(refundDetails.paidPayment));
  addRow(ctx, 'Receiver Account No', refundDetails.receiverAccountNo);
  addRow(ctx, 'Payment Evidence', refundDetails.paidPaymentAvoidance?.name || refundDetails.paymentEvidence || 'Not attached');
  addRow(ctx, 'Bank Name', refundDetails.bankName);
  addRow(ctx, 'Account Title', refundDetails.accountTitle);
  addRow(ctx, 'Account No', refundDetails.accountNo);
  addRow(ctx, 'IBAN', refundDetails.ibanNo);

  addUndertaking(ctx, 'Refund Undertaking', refundUndertaking, Boolean(refundDetails.undertakingApproved || refundDetails.undertakingAccepted));

  finishSlip(ctx, `account-details-${sanitizeFilePart(refundDetails.accountTitle || caseClosure.name)}-${Date.now()}.pdf`);
};

export const generateMainRefundSlip = (refund) => {
  const caseClosure = refund?.caseClosure || {};
  const refundDetails = refund?.refundDetails || {};
  const ctx = createSlip('REFUND SLIP', `Date: ${formatDate(refund?.createdAt || new Date())}`);

  addSection(ctx, 'Case Closure Details');
  addRow(ctx, 'Name', caseClosure.name);
  addRow(ctx, 'CNIC', caseClosure.cnic);
  addRow(ctx, 'Phone', caseClosure.phone);
  addRow(ctx, 'Email', caseClosure.email);
  addRow(ctx, 'Case Type', caseClosure.caseType);
  addRow(ctx, 'Case Close Reason', caseClosure.caseCloseReason);
  addUndertaking(ctx, 'Case Closure Undertaking', caseClosureUndertaking, Boolean(caseClosure.undertakingApproved || caseClosure.undertakingAccepted));

  addSection(ctx, 'Refund Details');
  addRow(ctx, 'Total Case Payment', formatCurrency(refundDetails.totalCasePayment));
  addRow(ctx, 'Paid Payment Type', refundDetails.paidPaymentType);
  addRow(ctx, 'Paid Amount', formatCurrency(refundDetails.paidPayment));
  addRow(ctx, 'Receiver Account No', refundDetails.receiverAccountNo);
  addRow(ctx, 'Bank Name', refundDetails.bankName);
  addRow(ctx, 'Account Title', refundDetails.accountTitle);
  addRow(ctx, 'Account No', refundDetails.accountNo);
  addRow(ctx, 'IBAN', refundDetails.ibanNo);
  addRow(ctx, 'Current Status', refund?.status);
  addUndertaking(ctx, 'Refund Undertaking', refundUndertaking, Boolean(refundDetails.undertakingApproved || refundDetails.undertakingAccepted));

  finishSlip(ctx, `refund-slip-${sanitizeFilePart(caseClosure.name)}-${Date.now()}.pdf`);
};

export const downloadAllRefundSlips = (refund) => {
  generateCaseClosureSlip(refund);
  generateRefundDetailsSlip(refund, { includeUndertaking: true });
  generateMainRefundSlip(refund);
};
