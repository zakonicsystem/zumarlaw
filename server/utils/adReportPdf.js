import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { reportStatus } from './reportReview.js';
const logo = fileURLToPath(new URL('../../client/src/assets/ZumarLogo.png', import.meta.url));
const plum = '#57123f', ink = '#252333', muted = '#756676', line = '#e6dce3';
const labels = { totalLeads: 'Total no. of leads', fakeLeads: 'Unrelated / fake leads', noResponseLeads: 'No response leads', interestedLeads: 'New / interested leads', matureLeads: 'Mature leads', previousMatureLeads: 'Previous mature leads', followUpLeads: 'Follow up leads', convertedNew: 'Converted clients - new', convertedOld: 'Converted clients - old' };

export function createAdReportPdf({ reports, range, period = 'daily', individual = false }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: 'Employee Daily AD Report', Author: 'Zumar Law Firm' } });
  const left = 40, width = 515.28, gap = 16, half = (width - gap) / 2;
  let y = 0;
  function header(title, subtitle) {
    doc.rect(0, 0, doc.page.width, 96).fill(plum);
    doc.image(logo, left, 18, { fit: [125, 59], align: 'center', valign: 'center' });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('ZUMAR LAW ASSOCIATES', 190, 24, { width: 365 });
    doc.font('Helvetica').fontSize(9).text('PRIVATE LIMITED  |  HEAD OFFICE ISLAMABAD', 190, 47, { width: 365 });
    doc.fontSize(8).fillColor('#ecd4bc').text('051-8445095  |  team@zumarlawfirm.com', 190, 64, { width: 365 });
    doc.fillColor(plum).font('Helvetica-Bold').fontSize(19).text(title, left, 116, { width });
    doc.fillColor(muted).font('Helvetica').fontSize(9).text(subtitle, left, 142, { width });
    y = 157;
  }
  function ensure(height) {
    if (y + height > 775) { doc.addPage(); header('DAILY AD REPORT / CONTINUED', 'Additional report details'); }
  }
  function section(title) {
    ensure(65);
    doc.roundedRect(left, y, width, 23, 4).fill('#f5edf2');
    doc.fillColor(plum).font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), left + 10, y + 7, { width: width - 20 });
    y += 29;
  }
  function pair(a, b) {
    const entries = [a, b];
    const heights = entries.map(entry => {
      if (!entry) return 0;
      doc.font('Helvetica').fontSize(10);
      return doc.heightOfString(String(entry[1] ?? '—'), { width: half - 20 }) + 23;
    });
    const height = Math.max(36, ...heights);
    ensure(height + 7);
    entries.forEach((entry, i) => {
      if (!entry) return;
      const x = left + i * (half + gap);
      doc.roundedRect(x, y, half, height, 4).lineWidth(0.6).strokeColor(line).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(muted).text(entry[0], x + 10, y + 7, { width: half - 20 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(String(entry[1] ?? '—'), x + 10, y + 21, { width: half - 20 });
    });
    y += height + 5;
  }
  function comments(title, value) {
    const text = String(value || '—');
    doc.font('Helvetica').fontSize(9);
    const parts = text.split(/\n/);
    // Wrap explicitly so long comments can continue onto another page without clipping.
    const lines = [];
    for (const part of parts) {
      let current = '';
      for (const char of part) {
        if (doc.widthOfString(current + char) > width - 22) { lines.push(current); current = ''; }
        current += char;
      }
      lines.push(current);
    }
    let first = true;
    while (lines.length) {
      ensure(54);
      const count = Math.max(1, Math.floor((775 - y - 30) / 12));
      const chunk = lines.splice(0, count);
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(8).text(title + (first ? '' : ' (continued)'), left, y, { width });
      doc.fillColor(ink).font('Helvetica').fontSize(9).text(chunk.join('\n'), left + 2, y + 14, { width: width - 4, lineGap: 2 });
      y += 25 + chunk.length * 12;
      doc.moveTo(left, y - 5).lineTo(left + width, y - 5).strokeColor(line).stroke();
      first = false;
    }
  }
  function signaturePair(a, b) {
    ensure(56);
    [a, b].forEach(([title, value], i) => {
      const x = left + i * (half + gap);
      doc.font('Helvetica-Oblique').fontSize(11).fillColor(ink).text(value || '', x + 4, y + 3, { width: half - 8, height: 28, ellipsis: true });
      doc.moveTo(x, y + 34).lineTo(x + half, y + 34).strokeColor(muted).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(muted).text(title, x, y + 42, { width: half });
    });
    y += 56;
  }
  if (!individual) {
    header(`${period.toUpperCase()} EMPLOYEE REPORT`, `${range.start} to ${range.end}`);
    section('Period overview');
    pair(['Submitted daily reports', reports.length], ['Employees reporting', new Set(reports.map(r => String(r.employee || r.employeeName))).size]);
    section('Lead performance totals');
    const totals = Object.entries(labels).map(([key, name]) => [name, reports.reduce((sum, r) => sum + (r[key] || 0), 0)]);
    for (let i = 0; i < totals.length; i += 2) pair(totals[i], totals[i + 1]);
    comments('Reporting period', 'Totals reflect the daily reports submitted for this period. Individual reports follow with employee details and supervisor reviews.');
  }
  reports.forEach((r, index) => {
    if (!individual || index) doc.addPage();
    const statusLabels = { pending: 'Pending supervisor review', objected: 'Objection raised', resubmitted: 'Resubmitted for review', approved: 'Approved' };
    header('DAILY AD REPORT', `Report date: ${r.reportDate}   |   ${statusLabels[reportStatus(r)]}`);
    section('Employee details');
    pair(['Employee name', r.employeeName], ['Designation', r.designation]);
    pair(['Dealing service', r.dealingService], ['Employee cell no.', r.employeePhone]);
    section('Lead details');
    pair(['Total no. of leads', r.totalLeads], ['No response leads', r.noResponseLeads]);
    pair(['Unrelated / fake leads', r.fakeLeads], ['New / interested leads', r.interestedLeads]);
    pair(['Mature leads', r.matureLeads], ['Previous mature leads', r.previousMatureLeads]);
    pair(['Follow up leads', r.followUpLeads], ['Converted clients - new', r.convertedNew]);
    pair(['Converted clients - old', r.convertedOld], ['Converted client name(s)', r.convertedClientName || '—']);
    comments('Fake lead comments', r.fakeComments);
    comments('Follow up lead comments', r.followUpComments);
    signaturePair(['Employee signature', r.employeeSignature], ['Report date', r.reportDate]);
    section('Official use only');
    signaturePair(['Supervisor name', r.supervisorName], ['Supervisor signature', r.supervisorSignature]);
    comments('Supervisor remark', r.remark);
    if (r.objectionRemark) comments('Supervisor objection', r.objectionRemark);
    if (r.correctionRemark) comments('Employee correction note', r.correctionRemark);
    if (r.reviewHistory?.length) {
      section('Review and correction history');
      for (const event of r.reviewHistory) comments(`${statusLabels[event.action] || event.action} - ${event.actorName || 'Staff'}`, event.remark);
    }
  });
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(left, 786).lineTo(left + width, 786).strokeColor(line).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(muted).text('Zumar Law Firm  |  Internal employee reporting', left, 792, { width: 390, lineBreak: false });
    doc.text(`Page ${i + 1} of ${pages.count}`, 450, 792, { width: 105, align: 'right', lineBreak: false });
  }
  return doc;
}
