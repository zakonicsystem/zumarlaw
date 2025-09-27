import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import jsPDF from 'jspdf';
import { zumarLogoBase64 } from '../assets/zumarLogoBase64';

const TABS = [
  { key: 'converted', label: 'Converted Service' },
  { key: 'manual', label: 'Manual Service' },
  { key: 'processing', label: 'Service Processing' },
];

const columns = [
  { key: 'serviceType', label: 'Service Type' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'totalPayment', label: 'Total' },
  { key: 'remainingAmount', label: 'Remaining' },
  { key: 'currentReceivingPayment', label: 'Current Received' },
  { key: 'actions', label: 'Actions' },
];


const AccountStatsModal = ({ open, onClose, dataByType = {}, onEdit }) => {
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [viewIdx, setViewIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('converted');
  // Track additional payments for the edit modal
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [paymentsIdx, setPaymentsIdx] = useState(null);
  // Payments state for modal
  const [paymentsData, setPaymentsData] = useState({});
  const [loadingPayments, setLoadingPayments] = useState(false);
  // Edit payment modal state
  const [editPaymentIdx, setEditPaymentIdx] = useState(null);
  const [editPaymentData, setEditPaymentData] = useState(null);
  const [editPaymentLoading, setEditPaymentLoading] = useState(false);
  // Open edit payment modal
  const handleEditPayment = (paymentIdx) => {
    const payment = paymentsData.payments?.[paymentIdx] || null;
    if (payment) {
      setEditPaymentIdx(paymentIdx);
      setEditPaymentData({ ...payment });
    }
  };

  // Close edit payment modal
  const handleCloseEditPayment = () => {
    setEditPaymentIdx(null);
    setEditPaymentData(null);
    setEditPaymentLoading(false);
  };

  // Submit edit payment
  const handleSubmitEditPayment = async (e) => {
    e.preventDefault();
    if (!editPaymentData) return;
    setEditPaymentLoading(true);
    let url = '';
    if (activeTab === 'converted') {
      url = `/convertedService/${filtered[paymentsIdx]._id}/payments/${editPaymentIdx}`;
    } else if (activeTab === 'manual') {
      url = `/manualService/${filtered[paymentsIdx]._id}/payments/${editPaymentIdx}`;
    } else if (activeTab === 'processing') {
      url = `/processing/${filtered[paymentsIdx]._id}/payments/${editPaymentIdx}`;
    }
    try {
      const res = await axios.patch(url, editPaymentData);
      if (res.data && res.data.success) {
        setPaymentsData(res.data);
        toast.success('Payment updated!');
        handleCloseEditPayment();
      } else {
        toast.error(res.data?.message || 'Failed to update payment');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Network error: Payment not updated');
    }
    setEditPaymentLoading(false);
  };

  // Delete payment
  const handleDeletePayment = async (paymentIdx) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    let url = '';
    if (activeTab === 'converted') {
      url = `/convertedService/${filtered[paymentsIdx]._id}/payments/${paymentIdx}`;
    } else if (activeTab === 'manual') {
      url = `/manualService/${filtered[paymentsIdx]._id}/payments/${paymentIdx}`;
    } else if (activeTab === 'processing') {
      url = `/processing/${filtered[paymentsIdx]._id}/payments/${paymentIdx}`;
    }
    setLoadingPayments(true);
    try {
      const res = await axios.delete(url);
      if (res.data && res.data.success) {
        setPaymentsData(res.data);
        toast.success('Payment deleted!');
      } else {
        toast.error(res.data?.message || 'Failed to delete payment');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Network error: Payment not deleted');
    }
    setLoadingPayments(false);
  };

  // Fetch payments from backend when payments modal opens
  React.useEffect(() => {
    if (paymentsModalOpen && paymentsIdx !== null) {
      setLoadingPayments(true);
      const row = filtered[paymentsIdx];
      let url = '';
      if (activeTab === 'converted') {
        url = `/convertedService/${row._id}/payments`;
      } else if (activeTab === 'manual') {
        url = `/manualService/${row._id}/payments`;
      } else if (activeTab === 'processing') {
        url = `/processing/${row._id}/payments`;
      }
      if (url) {
        fetch(url)
          .then(res => res.json())
          .then(data => {
            setPaymentsData(data);
            setLoadingPayments(false);
          })
          .catch(() => setLoadingPayments(false));
      }
    }
  }, [paymentsModalOpen, paymentsIdx, activeTab]);
  // Helper to get all payments for a row (updated for pricing/otherPayments)
  const getPayments = (row) => {
    const payments = [];
    // First payment from pricing
    if (row.pricing && (row.pricing.currentReceivingPayment || row.pricing.totalPayment)) {
      payments.push({
        label: 'First Payment',
        amount: row.pricing.currentReceivingPayment || row.pricing.totalPayment,
        date: row.pricing.paymentReceivedDate,
        method: row.pricing.paymentMethod,
        accountNumber: row.pricing.accountNumber,
        personName: row.pricing.personName,
        remarks: row.pricing.remarks,
      });
    }
    // Additional payments from otherPayments array
    if (row.otherPayments && Array.isArray(row.otherPayments)) {
      row.otherPayments.forEach((p, i) => {
        payments.push({
          label: i === 0 ? 'Second Payment' : i === 1 ? 'Third Payment' : `Payment ${i + 2}`,
          amount: p.currentReceivingPayment || p.totalPayment,
          date: p.paymentReceivedDate,
          method: p.paymentMethod,
          accountNumber: p.accountNumber,
          personName: p.personName,
          remarks: p.remarks,
          documentUrl: p.documentUrl || '',
        });
      });
    }
    return payments;
  };
  // Open payments modal
  const handlePaymentsModalOpen = (idx) => {
    setPaymentsIdx(idx);
    setPaymentsModalOpen(true);
  };
  const handlePaymentsModalClose = () => {
    setPaymentsModalOpen(false);
    setPaymentsIdx(null);
  };

  // Ensure all modal states are reset when closing main modal
  const handleCloseModal = () => {
    setPaymentsModalOpen(false);
    setPaymentsIdx(null);
    setEditIdx(null);
    setEditRow({});
    setViewIdx(null);
    if (onClose) onClose();
  };
  // Payment Slip handler
  const handlePaymentSlip = (rowIdx, paymentIdx) => {
    try {
      const row = filtered[rowIdx];
      const payments = row.payments || paymentsData?.payments || [];
      // If paymentIdx is undefined/null, generate full payment history slip
      if (typeof paymentIdx !== 'number') {
        // Full payment history PDF
        const pdf = new jsPDF();
        const primaryColor = [87, 18, 63];
        // Add logo if available
        if (zumarLogoBase64) {
          pdf.addImage(zumarLogoBase64, 'PNG', 80, 10, 50, 20);
        }
        pdf.setFontSize(18);
        pdf.setTextColor(...primaryColor);
        pdf.text('ZUMAR LAW FIRM', 105, 35, { align: 'center' });
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Full Payment History', 105, 45, { align: 'center' });
        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.7);
        pdf.line(20, 50, 190, 50);
        pdf.setFontSize(11);
        let y = 60;
        pdf.text(`Client: ${row.name || '-'}`, 15, y);
        pdf.text(`Service: ${row.service || row.serviceType || '-'}`, 120, y);
        y += 8;
        pdf.text(`Phone: ${row.phone || '-'}`, 15, y);
        y += 8;
        pdf.text(`Total Service Amount: Rs. ${row.totalPayment || '-'}`, 15, y);
        y += 8;
        pdf.text(`Total Received: Rs. ${row.currentReceivingPayment || '-'}`, 15, y);
        pdf.text(`Remaining: Rs. ${row.remainingAmount || '-'}`, 120, y);
        y += 12;
        pdf.setFontSize(12);
        pdf.setTextColor(...primaryColor);
        pdf.text('Payments:', 15, y);
        pdf.setTextColor(0,0,0);
        y += 6;
        pdf.setFontSize(10);
        if (payments.length === 0) {
          pdf.text('No payments found.', 15, y);
        } else {
          payments.forEach((p, i) => {
            if (y > 270) { pdf.addPage(); y = 20; }
            pdf.setDrawColor(220, 220, 220);
            pdf.roundedRect(13, y-2, 180, 10, 2, 2);
            pdf.text(`${i+1}. Amount: Rs. ${p.amount || '-'} | Date: ${p.date ? new Date(p.date).toLocaleDateString() : '-'} | Method: ${p.method || '-'} | Account: ${p.accountNumber || '-'} | Person: ${p.personName || '-'} | Remarks: ${p.remarks || '-'}`, 15, y+5);
            y += 14;
          });
        }
        pdf.setFontSize(8);
        pdf.setTextColor(120,120,120);
        pdf.text('This is a computer generated receipt. No signature required.', 105, 285, { align: 'center' });
        pdf.save(`payment_history_${row._id}.pdf`);
        toast.success('Full payment history slip downloaded!');
        return;
      }
      // Otherwise, generate single payment slip (modal)
      let payment;
      if (typeof paymentIdx === 'number') {
        payment = payments[paymentIdx] || {};
      } else {
        payment = {
          personName: row.personName || row.name || '-',
          amount: row.currentReceivingPayment || row.totalPayment || '-',
          date: row.paymentReceivedDate || row.pricing?.paymentReceivedDate || '-',
          method: row.paymentMethod || row.pricing?.paymentMethod || '-',
        };
      }
      if (!payment.date) payment.date = '-';
      const pdf = new jsPDF();
      const paymentDate = payment.date ? new Date(payment.date).toLocaleDateString() : '-';
      const invoiceNo = `INV-${row._id}-${paymentIdx || 0}`;
      const primaryColor = [87, 18, 63];
      const lightPrimary = [93, 18, 67];
      // Add logo if available
      if (zumarLogoBase64) {
        pdf.addImage(zumarLogoBase64, 'PNG', 80, 10, 50, 20);
      }
      pdf.setDrawColor(...primaryColor);
      pdf.setLineWidth(0.5);
      pdf.rect(10, 10, 190, 277);
      pdf.setFontSize(24);
      pdf.setTextColor(...primaryColor);
      pdf.text('ZUMAR LAW FIRM', 105, 35, { align: 'center' });
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Payment Receipt', 105, 45, { align: 'center' });
      pdf.setDrawColor(200, 200, 200);
      pdf.roundedRect(15, 55, 180, 30, 3, 3);
      pdf.setFontSize(11);
      pdf.setTextColor(60,60,60);
      pdf.text(`Receipt No: ${invoiceNo}`, 20, 65);
      pdf.text(`Date: ${paymentDate}`, 20, 75);
      pdf.text(`Service Type: ${row.service || row.serviceType || activeTab}`, 120, 65);
      pdf.roundedRect(15, 90, 180, 45, 3, 3);
      pdf.setFontSize(12);
      pdf.setTextColor(...primaryColor);
      pdf.setFont(undefined, 'bold');
      pdf.text('Client Information', 20, 100);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(60,60,60);
      pdf.text(`Name: ${row.name || payment.personName || '-'}`, 25, 110);
      pdf.text(`Phone: ${row.phone || '-'}`, 25, 120);
      pdf.text(`Method: ${payment.method || '-'}`, 120, 110);
      if (payment.accountNumber) {
        pdf.text(`Account #: ${payment.accountNumber}`, 120, 120);
      }
      pdf.roundedRect(15, 140, 180, 70, 3, 3);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('Payment Information', 20, 150);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(60,60,60);
      pdf.text(`Date: ${payment.date ? (payment.date !== '-' ? new Date(payment.date).toLocaleDateString() : '-') : '-'}`, 25, 160);
      pdf.text(`Method: ${payment.method || '-'}`, 25, 170);
      pdf.text(`Amount Paid: Rs. ${payment.amount || '-'}`, 25, 180);
      pdf.text(`Received By: ${payment.personName || row.personName || '-'}`, 25, 190);
      if (payment.remarks) {
        pdf.text(`Remarks: ${payment.remarks}`, 25, 200);
      }
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(15, 215, 180, 40, 3, 3, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('Payment Summary', 20, 225);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(60,60,60);
      pdf.text(`Total Service Amount: Rs. ${row.totalPayment || '-'}`, 25, 235);
      pdf.text(`Total Received: Rs. ${row.currentReceivingPayment || payment.amount || '-'}`, 25, 245);
      pdf.text(`Remaining Amount: Rs. ${row.remainingAmount || '-'}`, 120, 245);
      pdf.setFillColor(87, 18, 63);
      pdf.rect(10, 277, 190, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text('This is a computer generated receipt. No signature required.', 105, 283, { align: 'center' });
      pdf.save(`payment_slip_${invoiceNo}.pdf`);
      toast.success('Payment slip downloaded successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate payment slip');
    }
  };
  const [search, setSearch] = useState('');
  const handleEditClick = (idx) => {
    setEditIdx(idx);
    setEditRow({ ...filtered[idx] });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditRow(r => ({ ...r, [name]: value }));
  };


  

  const handleViewClick = (idx) => {
    setViewIdx(idx);
  };

 

  if (!open) return null;

  const data = dataByType[activeTab] || [];
  const filtered = data.filter(row =>
    Object.values(row).join(' ').toLowerCase().includes(search.toLowerCase())
  );


  return (
    <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black bg-opacity-40">
  <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl relative overflow-hidden" style={{maxHeight: '90vh', overflowY: 'auto'}}>
        {/* Header with brand color */}
        <div className="bg-[#57123f] p-4 text-white">
          <h2 className="text-xl font-bold">Account Stats</h2>
          <button
            className="absolute top-3 right-3 cursor-pointer text-white hover:text-gray-200 text-2xl transition-colors"
            onClick={handleCloseModal}
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* Tabs with enhanced styling */}
          <div className="flex gap-4 mb-6 border-b">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`pb-2 px-6 font-semibold relative transition-colors
                ${activeTab === tab.key
                    ? 'text-[#57123f] border-b-2 border-[#57123f]'
                    : 'text-gray-500 hover:text-[#57123f]'
                  }
                ${activeTab === tab.key ? 'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#57123f]' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center mb-4">
          <i className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search..."
            className="border rounded px-3 py-2 w-full max-w-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[60vh]">
          {filtered.length > 0 ? (
            <div style={{ maxHeight: '80vh', overflowY: 'auto', overflowX: 'auto' }}>
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    {columns.map(col => (
                      <th key={col.key} className="px-4 py-2">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{row.serviceType || '-'}</td>
                      <td className="px-4 py-3">{row.name || '-'}</td>
                      <td className="px-4 py-3">{row.phone || '-'}</td>
                      <td className="px-4 py-3">{row.totalPayment}</td>
                      <td className="px-4 py-3">{row.remainingAmount}</td>
                      <td className="px-4 py-3">{row.currentReceivingPayment}</td>
                      <td className="px-4 py-3 flex gap-2 items-center">
                        <button
                          className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold"
                          onClick={() => handlePaymentSlip(idx)}
                          title="Payment Slip"
                        >
                          Slip
                        </button>
                        <button
                          className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold"
                          onClick={() => handlePaymentsModalOpen(idx)}
                          title="Manage Payments"
                        >
                          Payments
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No data found.</div>
          )}
        </div>
      </div>

      {/* Payments Modal */}
      {paymentsModalOpen && paymentsIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className="bg-white rounded-lg shadow-xl relative overflow-hidden"
            style={{ maxWidth: '600px', width: '95%', maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="bg-[#57123f] p-4 text-white">
              <h3 className="text-xl font-bold">Manage Payments</h3>
              <button
                className="absolute top-3 right-3 text-white hover:text-gray-200 text-2xl transition-colors"
                onClick={handlePaymentsModalClose}
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              {loadingPayments ? (
                <div className="text-center py-4">Loading payments...</div>
              ) : (
                <>
                  {/* First Payment */}
                  {(() => {
                    const row = filtered[paymentsIdx] || {};
                    const accountNumber =
                      paymentsData?.pricing?.accountNumber ??
                      row.accountNumber ??
                      row.pricing?.accountNumber ??
                      '-';
                    const receivedDateRaw =
                      paymentsData?.pricing?.paymentReceivedDate ??
                      row.paymentReceivedDate ??
                      row.pricing?.paymentReceivedDate;
                    const receivedDate = receivedDateRaw
                      ? new Date(receivedDateRaw).toLocaleDateString()
                      : '-';
                    return (
                      <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50">
                        <div className="font-semibold text-[#57123f] mb-2">Payment Details</div>
                        <div><span className="font-semibold">Total Payment:</span> {row.totalPayment ?? paymentsData?.pricing?.totalPayment ?? row.pricing?.totalPayment ?? '-'}</div>
                        <div><span className="font-semibold">Current Received:</span> {row.currentReceivingPayment ?? paymentsData?.pricing?.currentReceivingPayment ?? row.pricing?.currentReceivingPayment ?? '-'}</div>
                        <div><span className="font-semibold">Remaining:</span> {row.remainingAmount ?? paymentsData?.pricing?.remainingAmount ?? row.pricing?.remainingAmount ?? '-'}</div>
                        <div><span className="font-semibold">Payment Method:</span> {row.paymentMethod ?? paymentsData?.pricing?.paymentMethod ?? row.pricing?.paymentMethod ?? '-'}</div>
                        <div><span className="font-semibold">Account Number:</span> {accountNumber}</div>
                        <div><span className="font-semibold">Person Name:</span> {row.personName ?? paymentsData?.pricing?.personName ?? row.pricing?.personName ?? '-'}</div>
                        <div><span className="font-semibold">Received Date:</span> {receivedDate}</div>
                        <button
                          className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold mt-2"
                          onClick={() => handlePaymentSlip(paymentsIdx, 0)}
                        >
                          Payment Slip
                        </button>
                      </div>
                    );
                  })()}

                  {/* Additional Payments */}
                  {(paymentsData?.payments || []).length > 0 ? (
                    <div className="mb-4">
                      {paymentsData.payments.map((p, i) => (
                        <div key={i} className="mb-2 p-2 border rounded bg-gray-50 relative">
                          <div className="font-semibold text-[#57123f]">{p.label ?? `Payment ${i + 1}`}</div>
                          <div><span className="font-semibold">Amount:</span> {p.amount ?? '-'}</div>
                          <div><span className="font-semibold">Date:</span> {p.date ? new Date(p.date).toLocaleDateString() : '-'}</div>
                          <div><span className="font-semibold">Method:</span> {p.method ?? '-'}</div>
                          <div><span className="font-semibold">Account Number:</span> {p.accountNumber ?? '-'}</div>
                          <div><span className="font-semibold">Person Name:</span> {p.personName ?? '-'}</div>
                          <div><span className="font-semibold">Remarks:</span> {p.remarks ?? '-'}</div>
                          <div className="flex gap-2 mt-2">
                            <button
                              className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold"
                              onClick={() => handlePaymentSlip(paymentsIdx, i + 1)}
                            >
                              Payment Slip
                            </button>
                            <button
                              className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold"
                              onClick={() => handleEditPayment(i)}
                              title="Edit Payment"
                            >
                              Edit
                            </button>
                            <button
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold"
                              onClick={() => handleDeletePayment(i)}
                              title="Delete Payment"
                            >
                              &#128465;
                            </button>
                          </div>
                          {p.documentUrl && (
                            <a
                              href={p.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 underline text-xs"
                            >
                              Download Document
                            </a>
                          )}
                        </div>
                      ))}
      {/* Edit Payment Modal */}
      {editPaymentIdx !== null && editPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl relative overflow-hidden" style={{ maxWidth: '400px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="bg-[#57123f] p-4 text-white">
              <h3 className="text-xl font-bold">Edit Payment</h3>
              <button
                className="absolute top-3 right-3 text-white hover:text-gray-200 text-2xl transition-colors"
                onClick={handleCloseEditPayment}
              >
                &times;
              </button>
            </div>
            <form className="p-6" onSubmit={handleSubmitEditPayment}>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1">Amount</label>
                <input type="number" name="amount" className="border rounded px-2 py-1 w-full mb-2" required min="1"
                  value={editPaymentData.amount || ''}
                  onChange={e => setEditPaymentData(d => ({ ...d, amount: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1">Date</label>
                <input type="date" name="date" className="border rounded px-2 py-1 w-full mb-2" required
                  value={editPaymentData.date ? editPaymentData.date.slice(0,10) : ''}
                  onChange={e => setEditPaymentData(d => ({ ...d, date: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1">Method</label>
                <select
                  name="method"
                  className="border rounded px-2 py-1 w-full mb-2"
                  required
                  value={editPaymentData.method || ''}
                  onChange={e => setEditPaymentData(d => ({ ...d, method: e.target.value }))}
                >
                  <option value="">Select Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank">Bank</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="Jazzcash">Jazzcash</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1">Account Number</label>
                <input type="text" name="accountNumber" className="border rounded px-2 py-1 w-full mb-2"
                  value={editPaymentData.accountNumber || ''}
                  onChange={e => setEditPaymentData(d => ({ ...d, accountNumber: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1">Person Name</label>
                <input type="text" name="personName" className="border rounded px-2 py-1 w-full mb-2"
                  value={editPaymentData.personName || ''}
                  onChange={e => setEditPaymentData(d => ({ ...d, personName: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold mb-1">Remarks</label>
                <input type="text" name="remarks" className="border rounded px-2 py-1 w-full mb-2"
                  value={editPaymentData.remarks || ''}
                  onChange={e => setEditPaymentData(d => ({ ...d, remarks: e.target.value }))}
                />
              </div>
              <button type="submit" className="bg-[#57123f] text-white px-4 py-2 rounded font-semibold" disabled={editPaymentLoading}>
                {editPaymentLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
                    </div>
                  ) : (
                    <div className="mb-4 text-gray-500">No additional payments found.</div>
                  )}

                  {/* Add New Payment */}
                  <form
                    className="mt-4"
                    onSubmit={async e => {
                      e.preventDefault();
                      const form = e.target;
                      const amount = Number(form.amount.value);
                      const date = form.date.value;
                      const method = form.method.value;
                      const accountNumber = form.accountNumber.value;
                      const personName = form.personName.value;
                      const remarks = form.remarks.value;
                      let url = '';
                      if (activeTab === 'converted') {
                        url = `/convertedService/${filtered[paymentsIdx]._id}/payments`;
                      } else if (activeTab === 'manual') {
                        url = `/manualService/${filtered[paymentsIdx]._id}/payments`;
                      } else if (activeTab === 'processing') {
                        url = `/processing/${filtered[paymentsIdx]._id}/payments`;
                      }
                      if (url) {
                        setLoadingPayments(true);
                        try {
                          const res = await axios.post(url, { amount, date, method, accountNumber, personName, remarks });
                          if (res.data && res.data.success) {
                            setPaymentsData(res.data);
                            toast.success('Payment added successfully!');
                          } else {
                            toast.error(res.data?.message || 'Failed to add payment');
                          }
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Network error: Payment not added');
                        }
                        setLoadingPayments(false);
                        form.reset();
                      }
                    }}
                  >
                    <div className="mb-2 flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold mb-1">Amount</label>
                        <input type="number" name="amount" className="border rounded px-2 py-1 w-full mb-2" required min="1" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold mb-1">Date</label>
                        <input type="date" name="date" className="border rounded px-2 py-1 w-full mb-2" required />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs font-semibold mb-1">Method</label>
                      <select
                        name="method"
                        className="border rounded px-2 py-1 w-full mb-2"
                        required
                        onChange={e => {
                          const val = e.target.value;
                          const accField = e.target.form.accountNumber;
                          if (accField) {
                            if (["Bank", "Easypaisa", "Jazzcash"].includes(val)) {
                              accField.parentElement.style.display = '';
                            } else {
                              accField.parentElement.style.display = 'none';
                              accField.value = '';
                            }
                          }
                        }}
                      >
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank">Bank</option>
                        <option value="Easypaisa">Easypaisa</option>
                        <option value="Jazzcash">Jazzcash</option>
                      </select>
                      <div style={{ display: 'none' }}>
                        <label className="block text-xs font-semibold mb-1">Account Number</label>
                        <input type="text" name="accountNumber" className="border rounded px-2 py-1 w-full mb-2" />
                      </div>
                      <label className="block text-xs font-semibold mb-1">Person Name</label>
                      <input type="text" name="personName" className="border rounded px-2 py-1 w-full mb-2" />
                      <label className="block text-xs font-semibold mb-1">Remarks</label>
                      <input type="text" name="remarks" className="border rounded px-2 py-1 w-full mb-2" />
                    </div>
                    <button type="submit" className="bg-[#57123f] text-white px-4 py-2 rounded font-semibold">
                      Add Payment
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  export default AccountStatsModal;
