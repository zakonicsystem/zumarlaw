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

const createFormSlip = (title) => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;

  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...primary);
  pdf.text(title, margin, 38);

  return { pdf, y: 78, margin, pageWidth, pageHeight };
};

const ensureFormPage = (ctx, needed = 40) => {
  if (ctx.y + needed <= ctx.pageHeight - 24) return;
  ctx.pdf.addPage();
  ctx.y = 34;
};

const addFormSectionTitle = (ctx, number, title) => {
  ensureFormPage(ctx, 28);
  const { pdf, margin } = ctx;
  pdf.setFillColor(...primary);
  pdf.circle(margin + 8, ctx.y - 5, 8, 'F');
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(number), margin + 8, ctx.y - 2, { align: 'center' });
  pdf.setFontSize(13);
  pdf.setTextColor(...primary);
  pdf.text(title, margin + 22, ctx.y);
  ctx.y += 28;
};

const addInputField = (ctx, label, value, col = 0, full = false) => {
  const { pdf, margin, pageWidth } = ctx;
  const gap = 12;
  const fieldWidth = full ? pageWidth - margin * 2 : (pageWidth - margin * 2 - gap) / 2;
  const x = full ? margin : margin + col * (fieldWidth + gap);
  const y = ctx.y;
  const boxHeight = 28;

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(45, 55, 72);
  pdf.text(label, x, y);

  pdf.setFillColor(249, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(x, y + 7, fieldWidth, boxHeight, 4, 4, 'FD');

  pdf.setFontSize(10);
  pdf.setTextColor(31, 41, 55);
  const lines = pdf.splitTextToSize(String(value || ''), fieldWidth - 16);
  pdf.text(lines.slice(0, 1), x + 10, y + 25);

  if (full || col === 1) ctx.y += 52;
};

const addTwoColumnFields = (ctx, fields) => {
  fields.forEach((field, index) => {
    ensureFormPage(ctx, 56);
    addInputField(ctx, field.label, field.value, index % 2, field.full);
    if (field.full && index % 2 === 0 && fields[index + 1]) {
      ctx.y += 0;
    }
  });
  if (fields.length % 2 === 1 && !fields[fields.length - 1]?.full) ctx.y += 52;
};

const addPolicyBox = (ctx, title, items) => {
  const { pdf, margin, pageWidth } = ctx;
  const boxWidth = pageWidth - margin * 2;
  const lineGroups = items.map((item) => pdf.splitTextToSize(item, boxWidth - 42));
  const height = 34 + lineGroups.reduce((sum, lines) => sum + lines.length * 12 + 4, 0);
  ensureFormPage(ctx, height + 24);

  const top = ctx.y;
  pdf.setFillColor(249, 245, 252);
  pdf.setDrawColor(236, 212, 188);
  pdf.roundedRect(margin, top, boxWidth, height, 5, 5, 'FD');

  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...primary);
  pdf.text(title, margin + 12, top + 22);

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(55, 65, 81);
  let y = top + 42;
  lineGroups.forEach((lines, index) => {
    pdf.text('•', margin + 14, y);
    if (index === lineGroups.length - 1) pdf.setFont(undefined, 'bold');
    pdf.text(lines, margin + 28, y);
    if (index === lineGroups.length - 1) pdf.setFont(undefined, 'normal');
    y += lines.length * 12 + 4;
  });

  ctx.y = top + height + 24;
};

const addFormUndertaking = (ctx, title, text, accepted, label) => {
  const { pdf, margin, pageWidth } = ctx;
  const boxWidth = pageWidth - margin * 2;
  const lines = pdf.splitTextToSize(text, boxWidth - 24);
  const height = 52 + lines.length * 11 + 22;
  ensureFormPage(ctx, height + 12);

  const top = ctx.y;
  pdf.setFillColor(249, 245, 252);
  pdf.setDrawColor(236, 212, 188);
  pdf.roundedRect(margin, top, boxWidth, height, 5, 5, 'FD');

  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...primary);
  pdf.text(title, margin + 12, top + 24);

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(55, 65, 81);
  pdf.text(lines, margin + 12, top + 46);

  const checkboxY = top + 46 + lines.length * 11 + 12;
  pdf.setDrawColor(37, 99, 235);
  pdf.setFillColor(accepted ? 37 : 255, accepted ? 99 : 255, accepted ? 235 : 255);
  pdf.rect(margin + 12, checkboxY - 9, 11, 11, 'FD');
  if (accepted) {
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(1.4);
    pdf.line(margin + 14, checkboxY - 4, margin + 17, checkboxY - 1);
    pdf.line(margin + 17, checkboxY - 1, margin + 22, checkboxY - 7);
  }
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(55, 65, 81);
  pdf.text(label, margin + 32, checkboxY);

  ctx.y = top + height + 12;
};

const saveFormSlip = (ctx, fileName) => {
  ctx.pdf.save(fileName);
};

export const generateCaseClosureSlip = (refundOrCaseClosure) => {
  const caseClosure = refundOrCaseClosure?.caseClosure || refundOrCaseClosure || {};
  const ctx = createFormSlip('Case Closure Request');
  const accepted = Boolean(caseClosure.undertakingApproved || caseClosure.undertakingAccepted || caseClosure.tAndCAccepted);

  addFormSectionTitle(ctx, 1, 'Person Details');
  addTwoColumnFields(ctx, [
    { label: 'Name', value: caseClosure.name },
    { label: 'CNIC', value: caseClosure.cnic },
    { label: 'Phone', value: caseClosure.phone },
    { label: 'Email', value: caseClosure.email }
  ]);

  addFormSectionTitle(ctx, 2, 'Case Details');
  addTwoColumnFields(ctx, [
    { label: 'Case Type', value: caseClosure.caseType },
    { label: 'Case Submit Date', value: formatDate(caseClosure.caseSubmitDate) },
    { label: 'Consultant Name', value: caseClosure.consultantName },
    { label: 'Case Close Reason', value: caseClosure.caseCloseReason }
  ]);

  addPolicyBox(ctx, 'Case Closure Policy', [
    'Both the client and the consultancy agree that the case will not be pursued any further.',
    'If the client himself admits that he had given false information and now wants to close the case.',
    'The client has decided to shift from one service to another.',
    'If a service is banned by the government.',
    'If the time given to the client by the company expires.',
    'If the government raises objections to the case that make it impossible to proceed with the case.',
    'The Case Closure Request will be processed within five (5) working days.'
  ]);

  addFormUndertaking(ctx, 'Undertaking', caseClosureUndertaking, accepted, 'I accept the Case Closure Policy and Undertaking');
  saveFormSlip(ctx, `case-closure-${sanitizeFilePart(caseClosure.name)}-${Date.now()}.pdf`);
};

export const generateRefundDetailsSlip = (refundOrDetails) => {
  const refundDetails = refundOrDetails?.refundDetails || refundOrDetails || {};
  const caseClosure = refundOrDetails?.caseClosure || {};
  const ctx = createFormSlip('Refund Details');
  const accepted = Boolean(refundDetails.undertakingApproved || refundDetails.undertakingAccepted || refundDetails.refundPolicyAccepted);

  addFormSectionTitle(ctx, 1, 'Payment Paid Details');
  addTwoColumnFields(ctx, [
    { label: 'Total Case Payment', value: formatCurrency(refundDetails.totalCasePayment) },
    { label: 'Paid Payment Type', value: refundDetails.paidPaymentType },
    { label: 'Paid Payment', value: formatCurrency(refundDetails.paidPayment) },
    { label: 'Receiver Account No', value: refundDetails.receiverAccountNo },
    { label: 'Attached Paid Payment Avoidance', value: refundDetails.paidPaymentAvoidance?.name || refundDetails.paymentEvidence || 'Not attached', full: true }
  ]);

  addFormSectionTitle(ctx, 2, 'Bank Account Details for Refund');
  addTwoColumnFields(ctx, [
    { label: 'Bank Name', value: refundDetails.bankName },
    { label: 'Account Title', value: refundDetails.accountTitle },
    { label: 'Account No', value: refundDetails.accountNo },
    { label: 'IBAN No', value: refundDetails.ibanNo }
  ]);

  addPolicyBox(ctx, 'Easy Return and Refund Policy', [
    'A refund request can be submitted after the case completion time given by the institution is over.',
    'A refund request may be made by the government for dismissal of the case or ground for objection.',
    'Refund Government fee will be applicable only as per government rules.',
    'Tax payment of 18% of the total payment amount will be non-refundable.',
    'The refund application will be processed within 15 working days.',
    'If the payment is not confirmed in company account. The request will be considered null and void.',
    'After the refund request has been approved the amount will be transferred to the client provided account no within five (5) working Days.'
  ]);

  addFormUndertaking(ctx, 'Undertaking', refundUndertaking, accepted, 'I accept the Refund Policy and Undertaking');
  saveFormSlip(ctx, `account-details-${sanitizeFilePart(refundDetails.accountTitle || caseClosure.name)}-${Date.now()}.pdf`);
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
  addUndertaking(ctx, 'Case Closure Undertaking', caseClosureUndertaking, Boolean(caseClosure.undertakingApproved || caseClosure.undertakingAccepted || caseClosure.tAndCAccepted));

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
  addUndertaking(ctx, 'Refund Undertaking', refundUndertaking, Boolean(refundDetails.undertakingApproved || refundDetails.undertakingAccepted || refundDetails.refundPolicyAccepted));

  finishSlip(ctx, `refund-slip-${sanitizeFilePart(caseClosure.name)}-${Date.now()}.pdf`);
};

export const downloadAllRefundSlips = (refund) => {
  generateCaseClosureSlip(refund);
  generateRefundDetailsSlip(refund);
  generateMainRefundSlip(refund);
};
