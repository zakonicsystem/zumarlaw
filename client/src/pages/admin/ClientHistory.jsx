import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, Eye, X } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authHeaders = () => {
  const token = localStorage.getItem('employeeToken') || localStorage.getItem('adminToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fmtDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const money = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return '-';
  return `Rs. ${Number(value || 0).toLocaleString()}`;
};

const mainStatuses = ['All', 'New', 'Contacted', 'Follow-up', 'Mature', 'Converted', 'Processing', 'Completed', 'Rejected'];
const isEmployeeUser = () => !!localStorage.getItem('employeeToken');
const displayPhone = (phone) => (isEmployeeUser() ? '********' : (phone || '-'));


const TimelineList = ({ title, items, empty }) => (
  <div>
    <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
    {items?.length ? (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="border rounded p-3 bg-gray-50">
            <div className="text-sm text-gray-900">{item.label}</div>
            <div className="text-xs text-gray-500 mt-1">{fmtDate(item.date)}{item.by ? ` | ${item.by}` : ''}</div>
            {item.note && <div className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{item.note}</div>}
          </div>
        ))}
      </div>
    ) : (
      <div className="text-sm text-gray-500">{empty || 'No history available yet.'}</div>
    )}
  </div>
);

const buildTimeline = (record) => {
  const assignments = [
    ...(record.currentEmployee ? [{ label: `Current employee: ${record.currentEmployee}`, date: record.createdAt }] : []),
    ...(record.assignmentHistory || []).map((item) => ({
      label: `Employee changed from ${item.from || 'Unassigned'} to ${item.to || 'Unassigned'}`,
      date: item.changedAt,
      by: item.changedBy
    }))
  ];

  const statuses = [
    ...(record.currentStatus ? [{ label: `Current lead/service status: ${record.currentStatus}`, date: record.statusChangedAt || record.updatedAt || record.createdAt }] : []),
    ...(record.statusHistory || []).map((item) => ({
      label: `Status changed from ${item.from || '-'} to ${item.to || '-'}`,
      date: item.changedAt,
      by: item.changedBy
    })),
    ...(record.progressStatus ? [{ label: `Current progress: ${record.progressStatus}`, date: record.updatedAt || record.createdAt }] : []),
    ...(record.progressHistory || []).map((item) => ({
      label: `Progress changed from ${item.from || '-'} to ${item.to || '-'}`,
      date: item.changedAt,
      by: item.changedBy
    })),
    ...(record.paymentStatus ? [{ label: `Current payment status: ${record.paymentStatus}`, date: record.updatedAt || record.createdAt }] : []),
    ...(record.paymentStatusHistory || []).map((item) => ({
      label: `Payment status changed from ${item.from || '-'} to ${item.to || '-'}`,
      date: item.changedAt,
      by: item.changedBy
    }))
  ];

  const followUps = (record.followUps || []).map((item) => ({
    label: `Follow-up by ${item.employeeName || 'Employee'}`,
    date: item.createdAt,
    note: `${item.customerReport || ''}${item.nextFollowUpAt ? `\nNext follow-up: ${fmtDate(item.nextFollowUpAt)}` : ''}`
  }));

  const payments = (record.payments || []).map((item, idx) => ({
    label: `${item.label || `Installment ${idx + 1}`}: ${money(item.amount)} via ${item.method || '-'}`,
    date: item.date,
    by: item.personName,
    note: [
      item.accountNumber ? `Account: ${item.accountNumber}` : '',
      item.remarks ? `Remarks: ${item.remarks}` : ''
    ].filter(Boolean).join('\n')
  }));

  return { assignments, statuses, followUps, payments };
};

const HistoryModal = ({ record, onClose }) => {
  const timeline = useMemo(() => buildTimeline(record), [record]);
  const summary = record.paymentSummary || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{record.name || 'Client'} History</h3>
            <p className="text-sm text-gray-600">{record.email || '-'} | {displayPhone(record.phone)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-82px)] space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Type</div><div className="font-medium">{record.type}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Interested Service</div><div className="font-medium">{record.interestedService || '-'}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Created Date</div><div className="font-medium">{fmtDate(record.createdAt)}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Payment Clearance</div><div className="font-medium">{fmtDate(summary.clearanceDate)}</div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Total Payment</div><div className="font-medium">{money(summary.totalPayment)}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Received</div><div className="font-medium">{money(summary.totalReceived)}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Remaining</div><div className="font-medium">{money(summary.remainingAmount)}</div></div>
            <div className="border rounded p-3"><div className="text-xs text-gray-500">Installments</div><div className="font-medium">{summary.installments || 0}</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TimelineList title="Employee Handling" items={timeline.assignments} empty="No employee assignment changes recorded yet." />
            <TimelineList title="Lead / Service Status" items={timeline.statuses} empty="No status changes recorded yet." />
            <TimelineList title="Follow-up Details" items={timeline.followUps} empty="No follow-ups found for this client record." />
            <TimelineList title="Payments & Installments" items={timeline.payments} empty="No payments found for this client record." />
          </div>

          {record.fields && Object.keys(record.fields).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Submitted Service Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(record.fields).map(([key, value]) => (
                  <div key={key} className="border rounded p-2 text-sm">
                    <span className="font-medium">{key}: </span>
                    <span className="text-gray-700">{typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientHistory = () => {
  const isEmployee = isEmployeeUser();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchHistory = async (params = {}) => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/client-history`, {
        params,
        headers: authHeaders(),
        withCredentials: true
      });
      setHistory(res.data);
      if (!res.data.records?.length) toast.error('No client history found');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to fetch client history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    await fetchHistory({ email: email.trim(), phone: phone.trim() });
  };

  const records = history?.records || [];
  const filteredRecords = records.filter((record) => {
    const haystack = [
      record.name,
      record.email,
      record.phone,
      record.interestedService,
      record.currentEmployee,
      record.currentStatus,
      record.progressStatus,
      record.paymentStatus,
      record.type
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !searchTerm.trim() || haystack.includes(searchTerm.trim().toLowerCase());
    const statusValue = String(record.currentStatus || record.progressStatus || '').toLowerCase();
    const matchesStatus = statusFilter === 'All' || statusValue === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client History</h1>
          <p className="text-sm text-gray-600">Recent client history loads automatically. Search by email{isEmployee ? '' : ' or phone number'} to filter.</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 mb-5 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search client, email${isEmployee ? '' : ', phone'}, service, employee, or status`}
            className="w-full border rounded px-10 py-2"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {mainStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors ${statusFilter === status
                ? 'bg-[#57123f] text-white border-[#57123f]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {status}
            </button>
          ))}
        </div>

      </div>

      {history && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className="border rounded p-3 bg-white"><div className="text-xs text-gray-500">Total</div><div className="text-xl font-semibold">{history.counts?.total || 0}</div></div>
          <div className="border rounded p-3 bg-white"><div className="text-xs text-gray-500">Leads</div><div className="text-xl font-semibold">{history.counts?.leads || 0}</div></div>
          <div className="border rounded p-3 bg-white"><div className="text-xs text-gray-500">Converted</div><div className="text-xl font-semibold">{history.counts?.convertedServices || 0}</div></div>
          <div className="border rounded p-3 bg-white"><div className="text-xs text-gray-500">Manual</div><div className="text-xl font-semibold">{history.counts?.manualServices || 0}</div></div>
          <div className="border rounded p-3 bg-white"><div className="text-xs text-gray-500">Processing</div><div className="text-xl font-semibold">{history.counts?.processingServices || 0}</div></div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Client</th>
              <th className="p-3">Type</th>
              <th className="p-3">Service</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payments</th>
              <th className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length ? filteredRecords.map((record) => (
              <tr key={`${record.type}-${record.id}`} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium">{record.name || '-'}</div>
                  <div className="text-xs text-gray-500">{record.email || '-'} | {displayPhone(record.phone)}</div>
                </td>
                <td className="p-3">{record.type}</td>
                <td className="p-3">{record.interestedService || '-'}</td>
                <td className="p-3">{record.currentEmployee || 'Unassigned'}</td>
                <td className="p-3">{record.currentStatus || record.progressStatus || '-'}</td>
                <td className="p-3">{record.paymentSummary?.installments || 0} installments / {money(record.paymentSummary?.totalReceived)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setSelected(record)} className="inline-flex items-center gap-2 text-[#57123f] hover:bg-purple-50 rounded px-3 py-2">
                    <Eye size={16} />
                    View
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">{loading ? 'Loading client history...' : 'No client history found for this filter.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <HistoryModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default ClientHistory;
