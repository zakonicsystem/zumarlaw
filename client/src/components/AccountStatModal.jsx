import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import jsPDF from 'jspdf';
import { zumarLogoBase64 } from '../assets/zumarLogoBase64';
import { FaReceipt, FaMoneyBillWave } from 'react-icons/fa';

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


const AccountStatsModal = ({ open, onClose, dataByType = {}, onEdit, summary = {}, mode = '' }) => {
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
    const row = getFiltered()[paymentsIdx];
    if (!row) {
      toast.error('Row not found');
      setEditPaymentLoading(false);
      return;
    }
    if (activeTab === 'converted') {
      url = `/convertedService/${row._id}/payments/${editPaymentIdx}`;
    } else if (activeTab === 'manual') {
      url = `/manualService/${row._id}/payments/${editPaymentIdx}`;
    } else if (activeTab === 'processing') {
      url = `/processing/${row._id}/payments/${editPaymentIdx}`;
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
    const row = getFiltered()[paymentsIdx];
    if (!row) {
      toast.error('Row not found');
      return;
    }
    if (activeTab === 'converted') {
      url = `/convertedService/${row._id}/payments/${paymentIdx}`;
    } else if (activeTab === 'manual') {
      url = `/manualService/${row._id}/payments/${paymentIdx}`;
    } else if (activeTab === 'processing') {
      url = `/processing/${row._id}/payments/${paymentIdx}`;
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
      const row = getFiltered()[paymentsIdx];
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
      const row = getFiltered()[rowIdx];
      const payments = row.payments || paymentsData?.payments || [];
      // Only single payment slip (not full history)
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
      const pageWidth = pdf.internal.pageSize.getWidth();
      // --- Header: Logo and Firm Info ---
      if (zumarLogoBase64) {
        pdf.addImage(zumarLogoBase64, 'PNG', 15, 10, 30, 30);
      }
      pdf.setFontSize(13);
      pdf.setFont(undefined, 'bold');
      pdf.text('ZUMAR LAW ASSOCIATE', 55, 16);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text('(SMC-PRIVATE) LIMITED', 55, 22);
      pdf.setFontSize(9);
      pdf.text('Business Number : 04237242555', 55, 28);
      pdf.text('Office No 02 Second Floor Al-Meraj Arcade Chowk', 55, 33);
      pdf.text('Lahore,Pakistan', 55, 38);
      pdf.text('54000', 55, 43);
      pdf.text('0303-5988574', 55, 48);
      pdf.text('zumarlawfirm.com', 55, 53);
      // Invoice meta
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('INVOICE', pageWidth - 45, 16);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text(`DATE`, pageWidth - 45, 28);
      pdf.text(`${payment.date ? new Date(payment.date).toLocaleDateString() : '-'}`, pageWidth - 25, 28);
      pdf.text(`DUE DATE`, pageWidth - 45, 33);
      pdf.text(`${payment.date ? new Date(payment.date).toLocaleDateString() : '-'}`, pageWidth - 25, 33);
      pdf.text(`BALANCE DUE`, pageWidth - 45, 38);
      pdf.text(`${row.remainingAmount || '-'}`, pageWidth - 25, 38);
      // Divider
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(15, 58, pageWidth - 15, 58);
      // Bill To
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('BILL TO', 15, 65);
      pdf.setFontSize(12);
      pdf.text(`${row.name || payment.personName || '-'}`, 15, 72);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text('Lahore', 15, 77);
      pdf.text('Lahore', 15, 82);
      pdf.text(`${row.phone || '-'}`, 15, 87);
      // Table header
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('DESCRIPTION', 15, 97);
      pdf.text('TYPE', 80, 97);
      pdf.text('RATE', 110, 97);
      pdf.text('QTY', 140, 97);
      pdf.text('AMOUNT', 170, 97);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.line(15, 99, pageWidth - 15, 99);
      // Table row
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${row.service || row.serviceType || '-'}`, 15, 105);
      pdf.text('Complete', 80, 105);
      pdf.text(`${row.totalPayment || '-'}`, 110, 105);
      pdf.text('1', 140, 105);
      pdf.text(`${row.totalPayment || '-'}`, 170, 105);
      // Totals block (no tax)
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('SUBTOTAL', 120, 130);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${row.totalPayment || '-'}`, 170, 130);
      pdf.setFont(undefined, 'bold');
      pdf.text('DISCOUNT (0%)', 120, 135);
      pdf.setFont(undefined, 'normal');
      pdf.text('0', 170, 135);
      pdf.setFont(undefined, 'bold');
      pdf.text('TOTAL', 120, 140);
      pdf.setFont(undefined, 'normal');
      const total = (row.totalPayment || 0);
      pdf.text(`${total}`, 170, 140);
      pdf.setFont(undefined, 'bold');
      pdf.text('PAY BALANCE', 120, 145);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${row.currentReceivingPayment || payment.amount || '-'}`, 170, 145);
      pdf.setFont(undefined, 'bold');
      pdf.text('BALANCE DUE', 120, 150);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${row.remainingAmount || '-'}`, 170, 150);
      // Signature and footer
      pdf.setDrawColor(0, 0, 0);
      pdf.line(15, 175, 60, 175);
      pdf.setFontSize(9);
      pdf.text('Date Signed', 15, 180);
      pdf.text(`${payment.date ? new Date(payment.date).toLocaleDateString() : '-'}`, 60, 180);
      pdf.setFontSize(8);
      pdf.text('In case of any error or correction in the statement,contact the Official Number of :042-37242555', 15, 190);
      pdf.text('Visit us : zumarlawfirm.com', 15, 195);
      pdf.save(`payment_slip_${row._id}.pdf`);
      toast.success('Payment slip downloaded successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate payment slip');
    }
  };
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, completed, pending
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const handleEditClick = (idx) => {
    setEditIdx(idx);
    const row = getFiltered()[idx];
    setEditRow({ ...(row || {}) });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditRow(r => ({ ...r, [name]: value }));
  };




  const handleViewClick = (idx) => {
    setViewIdx(idx);
  };



  if (!open) return null;

  // Helper to compute sorted & filtered rows on demand to avoid "use before define" issues
  const getFiltered = () => {
    const data = dataByType[activeTab] || [];
    const getRowDate = (r) => {
      const val = r.updatedAt || r.paymentReceivedDate || (r.pricing && r.pricing.paymentReceivedDate) || r.createdAt || r.date || 0;
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date(0) : d;
    };
    const sortedData = [...data].sort((a, b) => getRowDate(b) - getRowDate(a));
    // Filter by search
    let f = sortedData.filter(row => Object.values(row).join(' ').toLowerCase().includes(search.toLowerCase()));
    // Filter by status
    if (statusFilter === 'completed') {
      f = f.filter(row => Number(row.totalPayment) === Number(row.currentReceivingPayment));
    } else if (statusFilter === 'pending') {
      f = f.filter(row => Number(row.totalPayment) !== Number(row.currentReceivingPayment));
    }
    // Date filter logic (by payments[].date)
    if (dateFilter.start || dateFilter.end) {
      f = f.filter(row => {
        let paymentDates = [];
        if (Array.isArray(row.payments)) {
          row.payments.forEach(p => { if (p.date) paymentDates.push(p.date); });
        }
        if (paymentDates.length === 0) return false;
        return paymentDates.some(dateStr => {
          const d = new Date(dateStr);
          let afterStart = true, beforeEnd = true;
          if (dateFilter.start) afterStart = d >= new Date(dateFilter.start);
          if (dateFilter.end) beforeEnd = d <= new Date(dateFilter.end);
          return afterStart && beforeEnd;
        });
      });
    }
    return f;
  };

  const filtered = getFiltered();

  // Columns visible depending on selected mode
  const visibleColumns = columns.filter(col => {
    if (!mode) return true;
    if (mode === 'totalRevenue') return ['serviceType', 'name', 'phone', 'totalPayment', 'actions'].includes(col.key);
    if (mode === 'totalReceived') return ['serviceType', 'name', 'phone', 'totalPayment', 'currentReceivingPayment', 'actions'].includes(col.key);
    if (mode === 'remaining') return ['serviceType', 'name', 'phone', 'totalPayment', 'remainingAmount', 'actions'].includes(col.key);
    return true;
  });


  return (
    <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl relative overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
                className={`pb-2 px-6 font-semibold relative transition-colors ${activeTab === tab.key ? 'text-[#57123f] border-b-2 border-[#57123f]' : 'text-gray-500 hover:text-[#57123f]'} ${activeTab === tab.key ? 'after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#57123f]' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mode views */}
          {mode === 'totalRevenue' && (
            <div className="text-center py-6">
              <h3 className="text-xl font-bold text-[#57123f] mb-2">Total Revenue</h3>
              <p className="text-3xl font-semibold">{summary.totalRevenue ?? 0} PKR</p>
            </div>
          )}
          {mode === 'totalReceived' && (
            <div className="text-center py-6">
              <h3 className="text-xl font-bold text-[#57123f] mb-2">Total Received</h3>
              <p className="text-2xl font-semibold">{summary.totalReceived ?? 0} PKR</p>
              <div className="mt-3">
                <span className="font-medium">Current Received: </span>
                <span className="font-semibold">{summary.currentReceived ?? summary.totalReceived ?? 0} PKR</span>
              </div>
            </div>
          )}
          {mode === 'remaining' && (
            <div className="text-center py-6">
              <h3 className="text-xl font-bold text-[#57123f] mb-2">Remaining / Pending</h3>
              <p className="text-2xl font-semibold">Total Amount: {summary.totalRevenue ?? 0} PKR</p>
              <div className="mt-3">
                <span className="font-medium">Remaining Amount: </span>
                <span className="font-semibold">{summary.remainingAmount ?? summary.pendingAmount ?? 0} PKR</span>
              </div>
            </div>
          )}

          {/* Full table view when no mode is active */}

          <>
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

            {/* Filter Buttons */}
            <div className="mb-4 flex gap-2">
              <button className={`px-3 py-1 rounded ${statusFilter === 'all' ? 'bg-[#57123f] text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('all')}>All</button>
              <button className={`px-3 py-1 rounded ${statusFilter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('completed')}>Completed</button>
              <button className={`px-3 py-1 rounded ${statusFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`} onClick={() => setStatusFilter('pending')}>Pending</button>
            </div>

            {/* Date Range Filter */}
            <div className="mb-4 flex gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Payment Date:</span>
                <input type="date" value={dateFilter.start} onChange={e => setDateFilter(df => ({ ...df, start: e.target.value }))} className="border rounded px-2 py-1" />
                <span>-</span>
                <input type="date" value={dateFilter.end} onChange={e => setDateFilter(df => ({ ...df, end: e.target.value }))} className="border rounded px-2 py-1" />
                <button className="ml-2 px-2 py-1 rounded bg-gray-200 text-gray-700" onClick={() => setDateFilter({ start: '', end: '' })} type="button">Clear</button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[60vh]">
              {filtered.length > 0 ? (
                <div style={{ maxHeight: '80vh', overflowY: 'auto', overflowX: 'auto' }}>
                  <table className="min-w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>{visibleColumns.map(col => <th key={col.key} className="px-4 py-2">{col.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => (
                        <tr key={row._id || idx} className="border-t hover:bg-gray-50">
                          {visibleColumns.find(c => c.key === 'serviceType') && <td className="px-4 py-3">{row.serviceType || '-'}</td>}
                          {visibleColumns.find(c => c.key === 'name') && <td className="px-4 py-3">{row.name || '-'}</td>}
                          {visibleColumns.find(c => c.key === 'phone') && <td className="px-4 py-3">{row.phone || '-'}</td>}
                          {visibleColumns.find(c => c.key === 'totalPayment') && <td className="px-4 py-3">{row.totalPayment ?? '-'}</td>}
                          {visibleColumns.find(c => c.key === 'remainingAmount') && <td className="px-4 py-3">{row.remainingAmount ?? '-'}</td>}
                          {visibleColumns.find(c => c.key === 'currentReceivingPayment') && <td className="px-4 py-3">{row.currentReceivingPayment ?? '-'}</td>}
                          {visibleColumns.find(c => c.key === 'actions') && (
                            <td className="px-4 py-3 flex gap-2 items-center">
                              <button className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1" onClick={() => handlePaymentSlip(idx)} title="Payment Slip"><FaReceipt className="inline" /><span className="sr-only">Slip</span></button>
                              <button className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1" onClick={() => handlePaymentsModalOpen(idx)} title="Manage Payments"><FaMoneyBillWave className="inline" /><span className="sr-only">Payments</span></button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">No data found.</div>
              )}
            </div>
          </>

        </div>

        {/* Payments Modal (separate overlay inside this modal) */}
        {paymentsModalOpen && paymentsIdx !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl relative overflow-hidden" style={{ maxWidth: '600px', width: '95%', maxHeight: '80vh' }}>
              <div className="bg-[#57123f] p-4 text-white">
                <h3 className="text-xl font-bold">Manage Payments</h3>
                <button className="absolute top-3 right-3 text-white hover:text-gray-200 text-2xl transition-colors" onClick={handlePaymentsModalClose}>&times;</button>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
                {loadingPayments ? <div className="text-center py-4">Loading payments...</div> : (
                  <>
                    {/* First Payment */}
                    {(() => {
                      const row = filtered[paymentsIdx] || {};
                      const accountNumber = paymentsData?.pricing?.accountNumber ?? row.accountNumber ?? row.pricing?.accountNumber ?? '-';
                      const receivedDateRaw = paymentsData?.pricing?.paymentReceivedDate ?? row.paymentReceivedDate ?? row.pricing?.paymentReceivedDate;
                      const receivedDate = receivedDateRaw ? new Date(receivedDateRaw).toLocaleDateString() : '-';
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
                          <button className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold mt-2" onClick={() => handlePaymentSlip(paymentsIdx, 0)}>Payment Slip</button>
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
                              <button className="bg-[#57123f] text-white px-2 py-1 rounded text-xs font-semibold" onClick={() => handlePaymentSlip(paymentsIdx, i + 1)}>Payment Slip</button>
                              <button className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold" onClick={() => handleEditPayment(i)} title="Edit Payment">Edit</button>
                              <button className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold" onClick={() => handleDeletePayment(i)} title="Delete Payment">&#128465;</button>
                            </div>
                            {p.documentUrl && <a href={p.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline text-xs">Download Document</a>}
                          </div>
                        ))}

                        {/* Edit Payment Modal */}
                        {editPaymentIdx !== null && editPaymentData && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                            <div className="bg-white rounded-lg shadow-xl relative overflow-hidden" style={{ maxWidth: '400px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                              <div className="bg-[#57123f] p-4 text-white">
                                <h3 className="text-xl font-bold">Edit Payment</h3>
                                <button className="absolute top-3 right-3 text-white hover:text-gray-200 text-2xl transition-colors" onClick={handleCloseEditPayment}>&times;</button>
                              </div>
                              <form className="p-6" onSubmit={handleSubmitEditPayment}>
                                <div className="mb-2">
                                  <label className="block text-xs font-semibold mb-1">Amount</label>
                                  <input type="number" name="amount" className="border rounded px-2 py-1 w-full mb-2" required min="1" value={editPaymentData.amount || ''} onChange={e => setEditPaymentData(d => ({ ...d, amount: e.target.value }))} />
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs font-semibold mb-1">Date</label>
                                  <input type="date" name="date" className="border rounded px-2 py-1 w-full mb-2" required value={editPaymentData.date ? editPaymentData.date.slice(0, 10) : ''} onChange={e => setEditPaymentData(d => ({ ...d, date: e.target.value }))} />
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs font-semibold mb-1">Method</label>
                                  <select name="method" className="border rounded px-2 py-1 w-full mb-2" required value={editPaymentData.method || ''} onChange={e => setEditPaymentData(d => ({ ...d, method: e.target.value }))}>
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
                                  <input type="text" name="accountNumber" className="border rounded px-2 py-1 w-full mb-2" value={editPaymentData.accountNumber || ''} onChange={e => setEditPaymentData(d => ({ ...d, accountNumber: e.target.value }))} />
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs font-semibold mb-1">Person Name</label>
                                  <input type="text" name="personName" className="border rounded px-2 py-1 w-full mb-2" value={editPaymentData.personName || ''} onChange={e => setEditPaymentData(d => ({ ...d, personName: e.target.value }))} />
                                </div>
                                <div className="mb-2">
                                  <label className="block text-xs font-semibold mb-1">Remarks</label>
                                  <input type="text" name="remarks" className="border rounded px-2 py-1 w-full mb-2" value={editPaymentData.remarks || ''} onChange={e => setEditPaymentData(d => ({ ...d, remarks: e.target.value }))} />
                                </div>
                                <button type="submit" className="bg-[#57123f] text-white px-4 py-2 rounded font-semibold" disabled={editPaymentLoading}>{editPaymentLoading ? 'Saving...' : 'Save Changes'}</button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4 text-gray-500">No additional payments found.</div>
                    )}

                    {/* Add New Payment form (keeps same behavior) */}
                    <form className="mt-4" onSubmit={async e => {
                      e.preventDefault();
                      const form = e.target;
                      const amount = Number(form.amount.value);
                      const date = form.date.value;
                      const method = form.method.value;
                      const accountNumber = form.accountNumber.value;
                      const personName = form.personName.value;
                      const remarks = form.remarks.value;
                      let url = '';
                      const row = filtered[paymentsIdx];
                      if (!row) return toast.error('Row not found');
                      if (activeTab === 'converted') url = `/convertedService/${row._id}/payments`;
                      else if (activeTab === 'manual') url = `/manualService/${row._id}/payments`;
                      else if (activeTab === 'processing') url = `/processing/${row._id}/payments`;
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
                    }}>
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
                        <select name="method" className="border rounded px-2 py-1 w-full mb-2" required onChange={e => {
                          const val = e.target.value;
                          const accField = e.target.form.accountNumber;
                          if (accField) {
                            if (["Bank", "Easypaisa", "Jazzcash"].includes(val)) accField.parentElement.style.display = '';
                            else { accField.parentElement.style.display = 'none'; accField.value = ''; }
                          }
                        }}>
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
                      <button type="submit" className="bg-[#57123f] text-white px-4 py-2 rounded font-semibold">Add Payment</button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountStatsModal;
