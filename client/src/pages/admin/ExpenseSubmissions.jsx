import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaCheck, FaEdit, FaTrash, FaFileAlt, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { zumarLogoBase64 } from '../../assets/zumarLogoBase64';
const typeMap = {
  1: 'Rent',
  2: 'Utility Bills',
  3: 'Traveling',
  4: 'Stationery',
  5: 'Foods',
  6: 'Furniture',
  7: 'Electronic Items',
  8: 'Marketing',
  9: 'Mobile Bills',
  10: 'Office Maintenance',
  11: 'Crockery'
};

export default function ExpenseSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    accountantName: '',
    accountantRole: '',
    paymentMethod: 'Cash',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    chequeNumber: '',
  });
  const [editable, setEditable] = useState(null);

  // Helper: filter out empty or placeholder accountant entries (e.g. only 'Anonymous')
  const filterAccountants = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(a => {
      if (!a) return false;
      // treat entries with only anonymous/default values as non-meaningful
      const name = (a.name || a.accountantName || '').toString().trim();
      const role = (a.role || a.accountantRole || '').toString().trim();
      const paymentMethod = (a.paymentMethod || '').toString().trim();
      const accountTitle = (a.accountTitle || a.account || a.bankName || '').toString().trim();
      const accountNumber = (a.accountNumber || a.chequeNumber || '').toString().trim();
      const notes = (a.notes || '').toString().trim();
      const date = a.date || a.paidAt || null;
      if (!name && !role && !paymentMethod && !accountTitle && !accountNumber && !notes && !date) return false;
      if (name && name.toLowerCase() === 'anonymous' && !role && !paymentMethod && !accountTitle && !accountNumber && !notes && !date) return false;
      return true;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get('https://app.zumarlawfirm.com/expense/submissions', cfg);
        const payload = res.data;
        const items = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
        setSubmissions(items);
      } catch (err) {
        console.error('Failed to load submissions', err);
        try {
          const res = await axios.get('https://app.zumarlawfirm.com/expense/submissions');
          const payload = res.data;
          const items = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
          setSubmissions(items);
        } catch (err2) {
          console.error('Unauthenticated fetch failed', err2);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Refuse action removed per request

  const openPayModal = (s) => { setSelected(s); setPayModalOpen(true); setProofFile(null); };

  // Ensure handlers for detail/edit buttons exist (fix ReferenceError when clicking)
  const handleOpenDetails = (s) => {
    const copy = { ...s, accountantDetails: filterAccountants(s.accountantDetails) };
    setSelected(copy); setShowModal(true); setEditMode(false); setEditable(copy);
  };
  const handleOpenEdit = (s) => {
    // Flatten sender fields into editable root so inputs bind consistently whether sender is nested or flat
    const editableInitial = {
      ...s,
      senderName: s.sender?.name || s.senderName || '',
      senderEmail: s.sender?.email || s.senderEmail || '',
      senderDesignation: s.sender?.designation || s.senderDesignation || '',
      senderPhone: s.sender?.phone || s.senderPhone || '',
      senderBankName: s.sender?.bankName || s.senderBankName || '',
      senderAccountNumber: s.sender?.accountNumber || s.senderAccountNumber || '',
      senderAccountTitle: s.sender?.accountTitle || s.senderAccountTitle || '',
      paymentMethod: s.sender?.paymentMethod || s.paymentMethod || '',
      accountantDetails: Array.isArray(s.accountantDetails) ? filterAccountants(s.accountantDetails).map(a => ({ ...a })) : []
    };
    const copy = { ...s, accountantDetails: editableInitial.accountantDetails };
    setSelected(copy); setShowModal(true); setEditMode(true); setEditable(editableInitial);
  };

  // Delete an expense
  const handleDelete = async (id) => {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(`https://app.zumarlawfirm.com/expense/${id}`, cfg);
      setSubmissions(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error('Delete failed', err.response?.data || err);
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Delete failed';
      alert(`Delete failed: ${message}`);
    }
  };

  const printSlip = async (expense) => {
    if (!expense) return;
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      // Header: logo left, company details on the right (matches attached layout)
      // Logo (try add, ignore failure)
      const logoSize = 96;
      const logoY = 12;
      if (zumarLogoBase64) {
        try { pdf.addImage(zumarLogoBase64, 'PNG', margin, logoY, logoSize, logoSize); } catch (e) { /* ignore */ }
      }

      // Company name and details to the right of logo
      const headerX = margin + logoSize + 14;
      const headerY = 20;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('ZUMAR LAW ASSOCIATE', headerX, headerY);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text('(SMC-PRIVATE) LIMITED', headerX, headerY + 18);

      pdf.setFontSize(10);
      const companyLines = [
        'Business Number : 04237242555',
        'Office No 02 Second Floor Al-Meraj Arcade Chowk',
        'Lahore,Pakistan',
        '54000',
        '0303-5988574',
        'zumarlawfirm.com'
      ];
      let ly = headerY + 36;
      pdf.setFont(undefined, 'normal');
      companyLines.forEach((ln) => { pdf.text(ln, headerX, ly); ly += 14; });

      // Move drawing Y to below the header block
      y = Math.max(ly + 8, margin + logoSize + 20);

      // Draw a neat 2-column details table (labels + values) with clear alignment
      const tableX = margin;
      const tableY = y;
      const tableW = pageWidth - margin * 2;
      const halfW = Math.round(tableW / 2);
      const labelW = 80; // width reserved for labels
      const rowH = 22;

      // Column headers centered in their halves
      pdf.setFontSize(13);
      pdf.setFont(undefined, 'bold');
      pdf.text('Sender Details', tableX + halfW / 2 - 30, tableY + 14);
      pdf.text('Expense Details', tableX + halfW + halfW / 2 - 36, tableY + 14);

      // Prepare rows (6 rows) — left side and right side pairs
      const left = [
        ['Name', expense.senderName || expense.sender?.name || '-'],
        ['Email', expense.senderEmail || expense.sender?.email || '-'],
        ['Phone', expense.senderPhone || expense.sender?.phone || '-'],
        ['Branch', expense.branch || expense.sender?.branch || '-'],
        ['Bank', expense.senderBankName || expense.sender?.bankName || '-'],
        ['Account #', expense.senderAccountNumber || expense.sender?.accountNumber || '-'],
      ];
      const right = [
        ['Category', expense.expenseTypeNumber ? `${expense.expenseTypeNumber} - ${typeMap[expense.expenseTypeNumber] || expense.expenseCategory}` : (expense.expenseCategory || '-')],
        ['Subcategory', expense.expenseSubCategory || '-'],
        ['Amount', `Rs ${expense.amount || 0}`],
        ['Payment Method', expense.paymentMethod || expense.sender?.paymentMethod || '-'],
        ['Remarks', expense.remarks || expense.otherDetails || '-'],
        ['Created By', expense.senderName || '-'],
      ];

      // Outer rectangle for the whole details table area
      const detailsHeight = rowH * left.length + 12;
      pdf.setDrawColor(180);
      pdf.rect(tableX, tableY + 18, tableW, detailsHeight, 'S');

      // Vertical divider in middle
      pdf.line(tableX + halfW, tableY + 18, tableX + halfW, tableY + 18 + detailsHeight);

      // Draw rows and vertical separators for label/value in each half
      for (let i = 0; i < left.length; i++) {
        const yRow = tableY + 18 + i * rowH + 14;
        // horizontal separator
        pdf.line(tableX, tableY + 18 + (i + 1) * rowH, tableX + tableW, tableY + 18 + (i + 1) * rowH);

        // Left label
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text(left[i][0] + ':', tableX + 8, yRow);
        // Left value (wrap if needed)
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(11);
        const leftVal = pdf.splitTextToSize(left[i][1], halfW - labelW - 20);
        pdf.text(leftVal, tableX + labelW + 12, yRow);

        // Right label
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text(right[i][0] + ':', tableX + halfW + 8, yRow);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(11);
        const rightVal = pdf.splitTextToSize(right[i][1], halfW - labelW - 20);
        pdf.text(rightVal, tableX + halfW + labelW + 12, yRow);
      }

      y = tableY + 18 + detailsHeight + 12;

      // Payment / Accountant Details — show only latest entry
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Payment / Accountant Details', margin, y);
      y += 14;

      const tblX = margin;
      const tblW = pageWidth - margin * 2;
      // columns: Accountant Name, Designation, Method, Account Title, Account Number, Date of Pay
      const w1 = Math.round(tblW * 0.20); // name
      const w2 = Math.round(tblW * 0.16); // designation
      const w3 = Math.round(tblW * 0.14); // method
      const w4 = Math.round(tblW * 0.20); // account title
      const w5 = Math.round(tblW * 0.18); // account number
      const w6 = tblW - (w1 + w2 + w3 + w4 + w5); // date
      const c1 = tblX; const c2 = c1 + w1; const c3 = c2 + w2; const c4 = c3 + w3; const c5 = c4 + w4; const c6 = c5 + w5;

      // header row
      pdf.setFillColor(245, 245, 247);
      pdf.rect(tblX, y, tblW, 22, 'F');
      pdf.setDrawColor(200);
      pdf.rect(tblX, y, tblW, 22, 'S');
      pdf.setFontSize(9);
      pdf.setTextColor(50);
      pdf.text('Accountant Name', c1 + 6, y + 15);
      pdf.text('Designation', c2 + 6, y + 15);
      pdf.text('Method of Pay', c3 + 6, y + 15);
      pdf.text('Account Title', c4 + 6, y + 15);
      pdf.text('Account #', c5 + 6, y + 15);
      pdf.text('Date of Pay', c6 + 6, y + 15);
      y += 22;

  const accountants = Array.isArray(expense.accountantDetails) ? filterAccountants(expense.accountantDetails) : [];
  const latest = accountants.length ? accountants[accountants.length - 1] : null;
      if (!latest) {
        pdf.setFont(undefined, 'normal'); pdf.setFontSize(9); pdf.text('No payment recorded for this expense yet.', tblX + 6, y + 14); y += 24;
      } else {
        // row border
        const rowH = 32;
        pdf.setDrawColor(220);
        pdf.rect(tblX, y, tblW, rowH, 'S');
        pdf.setFontSize(10);
        pdf.setTextColor(30);
        const acctName = latest.name || latest.accountantName || latest.accountant || '-';
        const acctRole = latest.role || latest.accountantRole || latest.designation || '-';
        const method = latest.paymentMethod || '-';
        const acctTitle = latest.accountTitle || latest.account || latest.bankName || '-';
        const acctNumber = latest.accountNumber || latest.chequeNumber || '-';
        const paidAtText = latest.date ? new Date(latest.date).toLocaleString() : (latest.paidAt ? new Date(latest.paidAt).toLocaleString() : (expense.paidAt ? new Date(expense.paidAt).toLocaleString() : '-'));

        // draw each cell, wrapping long text where needed
        const nameLines = pdf.splitTextToSize(acctName, w1 - 12);
        pdf.text(nameLines, c1 + 6, y + 16);

        const roleLines = pdf.splitTextToSize(acctRole, w2 - 12);
        pdf.text(roleLines, c2 + 6, y + 16);

        const methodLines = pdf.splitTextToSize(method, w3 - 12);
        pdf.text(methodLines, c3 + 6, y + 16);

        const titleLines = pdf.splitTextToSize(acctTitle, w4 - 12);
        pdf.text(titleLines, c4 + 6, y + 16);

        const numberLines = pdf.splitTextToSize(acctNumber, w5 - 12);
        pdf.text(numberLines, c5 + 6, y + 16);

        const dateLines = pdf.splitTextToSize(paidAtText, w6 - 12);
        pdf.text(dateLines, c6 + 6, y + 16);

        y += rowH + 6;
      }

      // Attempt to embed proof image (if any)
      if (expense.proof) {
        try {
          const proofUrl = String(expense.proof).startsWith('http') ? expense.proof : `https://app.zumarlawfirm.com/${expense.proof}`;
          // image extensions
          if (/\.(jpg|jpeg|png|gif)$/i.test(proofUrl)) {
            // fetch as blob then convert to dataURL
            const toDataURL = async (url) => {
              const resp = await fetch(url);
              const blob = await resp.blob();
              return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            };
            const imgData = await toDataURL(proofUrl);
            // determine format from data URL
            const mimeMatch = (imgData || '').match(/^data:(image\/[^;]+);/);
            const imgFmt = mimeMatch ? (mimeMatch[1].includes('jpeg') ? 'JPEG' : 'PNG') : 'PNG';
            // load image to get dimensions
            const imgElem = new Image();
            imgElem.src = imgData;
            await new Promise((res) => { imgElem.onload = res; imgElem.onerror = res; });
            const iw = imgElem.width || 200;
            const ih = imgElem.height || 200;
            const maxW = 180;
            const maxH = 180;
            const scale = Math.min(maxW / iw, maxH / ih, 1);
            const drawW = iw * scale;
            const drawH = ih * scale;
            // place image on right side above signatures if space allows
            const imgX = pageWidth - margin - drawW;
            pdf.addImage(imgData, imgFmt, imgX, y, drawW, drawH);
            y += drawH + 8;
          } else {
            // not an image — print link to file
            const proofUrlText = String(expense.proof).startsWith('http') ? expense.proof : `https://app.zumarlawfirm.com/${expense.proof}`;
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 200);
            pdf.text(`Proof: ${proofUrlText}`, margin, y + 12);
            y += 18;
          }
        } catch (e) {
          // ignore embedding errors, fallback to showing proof path
          try {
            const proofUrlText = String(expense.proof).startsWith('http') ? expense.proof : `https://app.zumarlawfirm.com/${expense.proof}`;
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 200);
            pdf.text(`Proof: ${proofUrlText}`, margin, y + 12);
            y += 18;
          } catch (e2) { /* swallow */ }
        }
      }

      // Signatures: CEO and Accountant at bottom
      const pageHeight = pdf.internal.pageSize.getHeight();
      const sigY = pageHeight - 120;
      const sigW = 200;
      const sigGap = 60;
      const sigX1 = margin;
      const sigX2 = margin + sigW + sigGap;
      pdf.setDrawColor(120);
      pdf.setLineWidth(0.8);
      pdf.line(sigX1, sigY, sigX1 + sigW, sigY);
      pdf.line(sigX2, sigY, sigX2 + sigW, sigY);
      pdf.setFontSize(10);
      pdf.setTextColor(40);
      pdf.text('CEO Signature', sigX1, sigY + 16);
      pdf.text('Accountant Signature', sigX2, sigY + 16);

      // small footer
      y = sigY + 40;
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text('This is a system generated slip.', margin, y);

      pdf.save(`expense_slip_${expense._id || Date.now()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF slip', err);
      alert('Failed to generate PDF slip');
    }
  };

  const submitPay = async (id) => {
    if (!proofFile) { alert('Please choose a proof file'); return; }
    setPayLoading(true);
    try {
      const token = localStorage.getItem('token');
      // let axios set Content-Type for FormData (do not set boundary manually)
      const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const fd = new FormData();
      fd.append('proof', proofFile);
      // accountant/payment fields
      fd.append('accountantName', paymentForm.accountantName || '');
      fd.append('accountantRole', paymentForm.accountantRole || '');
      fd.append('paymentMethod', paymentForm.paymentMethod || '');
      fd.append('bankName', paymentForm.bankName || '');
      fd.append('accountTitle', paymentForm.accountTitle || '');
      fd.append('accountNumber', paymentForm.accountNumber || '');
      fd.append('chequeNumber', paymentForm.chequeNumber || '');


      const res = await axios.post(`https://app.zumarlawfirm.com/expense/${id}/pay`, fd, cfg);
      console.log('pay response', res.data);
      // update local submissions state with returned expense if available
      const returned = res.data && (res.data.expense || res.data);
      if (returned && returned._id) {
        setSubmissions(prev => prev.map(it => it._id === returned._id ? ({ ...it, ...returned }) : it));
      } else {
        // fallback to refresh
        await refresh();
      }
      setPayModalOpen(false);
      setSelected(null);
      // reset form
      setPaymentForm({ accountantName: '', accountantRole: '', paymentMethod: 'Cash', bankName: '', accountTitle: '', accountNumber: '', chequeNumber: '' });
      setProofFile(null);
      // notify other pages (Expense page) that a payment happened so they can refresh accounts
      try {
        window.dispatchEvent(new Event('expense:paid'));
      } catch (e) {
        // ignore if window not available
      }
    } catch (err) {
      console.error('Pay failed', err.response?.data || err);
      const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Pay failed';
      alert(`Pay failed: ${message}`);
    } finally {
      setPayLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editable || !editable._id) return;
    try {
      const token = localStorage.getItem('token');
      const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
      // Build payload aligned with server model: nest sender object
      const payload = {
        sender: {
          name: editable.senderName,
          email: editable.senderEmail,
          designation: editable.senderDesignation,
          phone: editable.senderPhone,
          bankName: editable.senderBankName,
          accountNumber: editable.senderAccountNumber,
          accountTitle: editable.senderAccountTitle || editable.senderAccountTitle,
          paymentMethod: editable.paymentMethod || editable.sender?.paymentMethod || ''
        },
        expenseCategory: editable.expenseCategory,
        expenseSubCategory: editable.expenseSubCategory,
        remarks: editable.remarks,
        amount: Number(editable.amount) || 0,
        expenseDate: editable.expenseDate,
        branch: editable.branch,
      };
      if (Array.isArray(editable.accountantDetails)) {
        // filter out empty/placeholder entries (no meaningful fields)
        const filtered = (editable.accountantDetails || []).filter(a => {
          if (!a) return false;
          return Boolean((a.name && String(a.name).trim()) || (a.role && String(a.role).trim()) || (a.accountTitle && String(a.accountTitle).trim()) || (a.accountNumber && String(a.accountNumber).trim()) || (a.paymentMethod && String(a.paymentMethod).trim()));
        });
        if (filtered.length) payload.accountantDetails = filtered;
      }

      const res = await axios.put(`https://app.zumarlawfirm.com/expense/${editable._id}`, payload, cfg);
      const returned = res.data || null;
      if (returned && returned._id) {
        setSubmissions(prev => prev.map(it => it._id === returned._id ? ({ ...it, ...returned }) : it));
      } else {
        await refresh();
      }
      setShowModal(false);
      setSelected(null);
    } catch (err) {
      console.error('Save edit failed', err.response?.data || err);
      if (err.response?.status === 401) {
        alert('Unauthorized — please login and try again');
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Save failed';
        alert(`Save failed: ${msg}`);
      }
    }
  };

  return (
    <div className="p-2 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Expense Submissions</h2>
        <Link to="/admin/expense" className="text-sm p-2 rounded-sm bg-[#57123f] text-white">Back to Expense Page</Link>
      </div>

      <div className="overflow-x-auto rounded-lg shadow border">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100  text-left text-sm">
              <th className="p-2">Sender / Email</th>
              <th className="p-2">Phone / Type</th>
              <th className="p-2">Bank / Account</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Designation</th>
              <th className="p-2">Branch</th>
              {/* Removed Submitted By column as requested; use Status and row colors for paid/unpaid */}
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s._id} className={`border-b text-sm ${s.paid ? 'bg-green-50' : 'bg-red-50'}`}>
                <td className="p-2">
                  <div className="font-medium">{s.senderName || '-'}</div>
                  <div className="text-xs text-gray-600">{s.senderEmail || '-'}</div>
                </td>
                <td className="p-2">
                  <div className="font-medium">{s.senderPhone || '-'}</div>
                  <div className="text-xs font-bold text-gray-600">{(s.expenseCategory)}</div>
                </td>
                <td className="p-2">
                  <div className="font-medium">{s.senderBankName || '-'}</div>
                  <div className="text-xs text-gray-600">{s.senderAccountNumber || '-'}</div>
                </td>
                <td className="p-2">Rs {s.amount}</td>
                <td className="p-2">
                  {s.paid ? (
                    <span className="inline-block bg-green-200 text-green-800 text-xs px-2 py-1 rounded">Paid</span>
                  ) : (
                    <span className="inline-block bg-red-200 text-red-800 text-xs px-2 py-1 rounded">Unpaid</span>
                  )}
                </td>
                <td className="p-2">{s.senderDesignation || s.sender?.designation || '-'}</td>
                <td className="p-2">{s.branch || s.branchName || '-'}</td>
                {/* Submitted By and Paid columns removed; paid rows are highlighted */}
                <td className="p-2">
                  <div className="flex gap-2">
                    <button title="Pay" className={`w-3 h-3 rounded-full flex items-center justify-center ${s.paid ? 'bg-gray-300 text-white cursor-not-allowed' : 'text-[#57123f] '}`} onClick={() => openPayModal(s)} disabled={s.paid}><FaCheck /></button>
                    <button title="Edit" className="w-3 h-3 rounded-full flex items-center justify-center text-[#57123f]" onClick={() => handleOpenEdit(s)}><FaEdit /></button>
                    <button title="Delete" className="w-3 h-3 rounded-full flex items-center justify-center text-[#57123f]" onClick={() => handleDelete(s._id)}><FaTrash /></button>
                    <button title="Proof" className="w-3 h-3 rounded-full flex items-center justify-center text-[#57123f]" onClick={() => handleOpenDetails(s)}><FaFileAlt /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details / Edit Modal */}
      {showModal && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editMode ? 'Edit Expense' : 'Expense Details'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <strong>Sender:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.senderName || ''} onChange={(e) => setEditable({ ...editable, senderName: e.target.value })} />
                ) : (
                  <div>{selected.senderName || '-'}</div>
                )}
              </div>
              <div>
                <strong>Email:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.senderEmail || ''} onChange={(e) => setEditable({ ...editable, senderEmail: e.target.value })} />
                ) : (
                  <div>{selected.senderEmail || '-'}</div>
                )}
              </div>
              <div>
                <strong>Designation:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.senderDesignation || ''} onChange={(e) => setEditable({ ...editable, senderDesignation: e.target.value })} />
                ) : (
                  <div>{selected.senderDesignation || '-'}</div>
                )}
              </div>
              <div>
                <strong>Phone:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.senderPhone || ''} onChange={(e) => setEditable({ ...editable, senderPhone: e.target.value })} />
                ) : (
                  <div>{selected.senderPhone || '-'}</div>
                )}
              </div>
              <div>
                <strong>Type:</strong>
                <div>{selected.expenseTypeNumber ? `${selected.expenseTypeNumber} - ${typeMap[selected.expenseTypeNumber] || selected.expenseCategory}` : (selected.expenseCategory || '-')}</div>
              </div>
              <div>
                <strong>Bank:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.senderBankName || ''} onChange={(e) => setEditable({ ...editable, senderBankName: e.target.value })} />
                ) : (
                  <div>{selected.senderBankName || '-'}</div>
                )}
              </div>
              <div>
                <strong>Account #:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.senderAccountNumber || ''} onChange={(e) => setEditable({ ...editable, senderAccountNumber: e.target.value })} />
                ) : (
                  <div>{selected.senderAccountNumber || '-'}</div>
                )}
              </div>
              <div className="md:col-span-2">
                <strong>Remarks / Other:</strong>
                {editMode ? (
                  <textarea className="w-full border p-1" rows={3} value={editable.remarks || ''} onChange={(e) => setEditable({ ...editable, remarks: e.target.value })} />
                ) : (
                  <div>{selected.remarks || selected.otherDetails || '-'}</div>
                )}
              </div>
              <div>
                <strong>Date:</strong>
                {editMode ? (
                  <input type="date" className="w-full border p-1" value={editable.expenseDate ? editable.expenseDate.split('T')[0] : ''} onChange={(e) => setEditable({ ...editable, expenseDate: e.target.value })} />
                ) : (
                  <div>{selected.expenseDate ? new Date(selected.expenseDate).toLocaleString() : new Date(selected.createdAt).toLocaleString()}</div>
                )}
              </div>
              <div>
                <strong>Amount:</strong>
                {editMode ? (
                  <input type="number" className="w-full border p-1" value={editable.amount || ''} onChange={(e) => setEditable({ ...editable, amount: e.target.value })} />
                ) : (
                  <div>Rs {selected.amount}</div>
                )}
              </div>
              <div>
                <strong>Branch:</strong>
                {editMode ? (
                  <input className="w-full border p-1" value={editable.branch || ''} onChange={(e) => setEditable({ ...editable, branch: e.target.value })} />
                ) : (
                  <div>{selected.branch || selected.branchName || '-'}</div>
                )}
              </div>
              <div>
                <strong>Paid:</strong>
                <div>{selected.paid ? `Yes (${selected.paidAt ? new Date(selected.paidAt).toLocaleString() : ''})` : 'No'}</div>
              </div>
              <div className="md:col-span-2">
                <strong>Slip / Proof:</strong>
                <div className="mt-2">
                  {selected.proof ? (
                    <div className="flex flex-col gap-2">
                      {/* render image preview if image, else link */}
                      {(selected.proof.match(/\.(jpg|jpeg|png|gif)$/i)) ? (
                        <img src={`https://app.zumarlawfirm.com/${selected.proof}`} alt="proof" className="max-h-60 rounded" />
                      ) : (
                        <div className="text-sm text-gray-700">Uploaded file: <span className="font-medium">{selected.proof.split('/').pop()}</span></div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => printSlip(selected)} className="px-3 py-1 border rounded bg-green-100 text-green-800">Print Slip</button>
                      </div>
                      <div className="mt-4 w-full">
                        <h4 className="font-semibold mb-2">Accountant / Payment History</h4>
                        {!editMode ? (
                          Array.isArray(selected.accountantDetails) && selected.accountantDetails.length ? (
                            <div className="space-y-2 text-sm">
                              {selected.accountantDetails.map((a, i) => (
                                <div key={i} className="p-2 border rounded">
                                  <div className="flex justify-between">
                                    <div><strong>{a.name || a.accountantName || 'Anonymous'}</strong> <span className="text-gray-600">({a.role || a.accountantRole || '-'})</span></div>
                                    <div className="text-gray-600">{a.date ? new Date(a.date).toLocaleString() : (a.paidAt ? new Date(a.paidAt).toLocaleString() : '')}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-700">Method: {a.paymentMethod || '-'}</div>
                                  <div className="text-xs text-gray-700">Account Title: {a.accountTitle || a.account || a.bankName || '-'}</div>
                                  <div className="text-xs text-gray-700">Account #: {a.accountNumber || a.chequeNumber || '-'}</div>
                                  {a.notes ? <div className="mt-1 text-xs text-gray-600">Notes: {a.notes}</div> : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">No accountant/payment history recorded.</div>
                          )
                        ) : (
                          <div className="space-y-3">
                            {(editable.accountantDetails || []).map((a, idx) => (
                              <div key={idx} className="p-2 border rounded">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                  <input className="border p-1" value={a.name || ''} onChange={(e) => { const copy = { ...editable }; copy.accountantDetails[idx] = { ...copy.accountantDetails[idx], name: e.target.value }; setEditable(copy); }} placeholder="Accountant name" />
                                  <input className="border p-1" value={a.role || ''} onChange={(e) => { const copy = { ...editable }; copy.accountantDetails[idx] = { ...copy.accountantDetails[idx], role: e.target.value }; setEditable(copy); }} placeholder="Designation/Role" />
                                  <input className="border p-1" value={a.paymentMethod || ''} onChange={(e) => { const copy = { ...editable }; copy.accountantDetails[idx] = { ...copy.accountantDetails[idx], paymentMethod: e.target.value }; setEditable(copy); }} placeholder="Method" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                  <input className="border p-1" value={a.accountTitle || ''} onChange={(e) => { const copy = { ...editable }; copy.accountantDetails[idx] = { ...copy.accountantDetails[idx], accountTitle: e.target.value }; setEditable(copy); }} placeholder="Account Title" />
                                  <input className="border p-1" value={a.accountNumber || ''} onChange={(e) => { const copy = { ...editable }; copy.accountantDetails[idx] = { ...copy.accountantDetails[idx], accountNumber: e.target.value }; setEditable(copy); }} placeholder="Account Number / Cheque #" />
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-2">
                                  <input type="datetime-local" className="border p-1" value={a.date ? new Date(a.date).toISOString().slice(0, 16) : ''} onChange={(e) => { const copy = { ...editable }; copy.accountantDetails[idx] = { ...copy.accountantDetails[idx], date: e.target.value ? new Date(e.target.value).toISOString() : null }; setEditable(copy); }} />
                                  <div className="flex gap-2">
                                    <button type="button" className="px-2 py-1 border rounded text-sm" onClick={() => { const copy = { ...editable }; copy.accountantDetails.splice(idx, 1); setEditable(copy); }}>Remove</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {/* Add Entry removed per request to avoid blank accountant entries */}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (<div>-</div>)}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editMode ? (
                <>
                  <button className="px-4 py-2 rounded bg-[#57123f] text-white" onClick={saveEdit}>Save</button>
                  <button className="px-4 py-2 rounded border" onClick={() => { setShowModal(false); setSelected(null); setEditMode(false); }}>Cancel</button>
                </>
              ) : (
                <button className="px-4 py-2 rounded border" onClick={() => { setShowModal(false); setSelected(null); }}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payModalOpen && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Pay Expense - {selected.senderName || selected._id}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Accountant Name</label>
                <input className="w-full border rounded px-2 py-1" value={paymentForm.accountantName} onChange={(e) => setPaymentForm({ ...paymentForm, accountantName: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium mb-1">Designation / Role</label>
                <input className="w-full border rounded px-2 py-1" value={paymentForm.accountantRole} onChange={(e) => setPaymentForm({ ...paymentForm, accountantRole: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium mb-1">Payment Method</label>
                <select className="w-full border rounded px-2 py-1" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {paymentForm.paymentMethod === 'Bank' && (
                <>
                  <div>
                    <label className="block font-medium mb-1">Bank Name</label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.bankName} onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Account Name </label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.accountTitle} onChange={(e) => setPaymentForm({ ...paymentForm, accountTitle: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-medium mb-1">Account Number</label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.accountNumber} onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })} />
                  </div>
                </>
              )}

              {paymentForm.paymentMethod === 'JazzCash' && (
                <>
                  <div>
                    <label className="block font-medium mb-1">JazzCash Title</label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.accountTitle} onChange={(e) => setPaymentForm({ ...paymentForm, accountTitle: e.target.value })} />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">JazzCash Number</label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.accountNumber} onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })} />
                  </div>
                </>
              )}

              {paymentForm.paymentMethod === 'EasyPaisa' && (
                <>
                  <div>
                    <label className="block font-medium mb-1">EasyPaisa Title</label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.accountTitle} onChange={(e) => setPaymentForm({ ...paymentForm, accountTitle: e.target.value })} />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">EasyPaisa Number</label>
                    <input className="w-full border rounded px-2 py-1" value={paymentForm.accountNumber} onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })} />
                  </div>
                </>
              )}

              {paymentForm.paymentMethod === 'Cheque' && (
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">Cheque Number</label>
                  <input className="w-full border rounded px-2 py-1" value={paymentForm.chequeNumber} onChange={(e) => setPaymentForm({ ...paymentForm, chequeNumber: e.target.value })} />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block font-medium mb-1">Upload Proof Screenshot</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files[0])} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded border" onClick={() => { setPayModalOpen(false); setSelected(null); setProofFile(null); setPaymentForm({ accountantName: '', accountantRole: '', paymentMethod: 'Cash', bankName: '', accountTitle: '', accountNumber: '', chequeNumber: '', notes: '' }); }}>Cancel</button>
              <button className="px-4 py-2 rounded bg-[#57123f] text-white" onClick={() => submitPay(selected._id)} disabled={payLoading}>{payLoading ? 'Paying...' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
