import React, { useState } from 'react';
import { FaEye, FaEdit, FaTrash, FaComments, FaHistory } from 'react-icons/fa';
import { serviceData } from '../../data/serviceSchemas';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import { getFollowUpDate, getFollowUpStageLabel } from '../../utils/leadTabs';

const LeadsTable = ({
  leads = [],
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onStatusChange,
  onAction,
  statusOptions = ['New', 'Contacted', 'Mature', 'Follow-up', 'Refusal'],
  isAllSelected = false,
  tableTitle = '',
  showFollowUpReportAction = false,
  onFollowUpReport,
  showFollowUpColumns = false,
  onLeadUpdated,
}) => {
  const [editModal, setEditModal] = useState({ open: false, lead: null });
  const [viewModal, setViewModal] = useState({ open: false, lead: null });
  const [historyModal, setHistoryModal] = useState({ open: false, lead: null });
  const isEmployee = !!localStorage.getItem('employeeToken');
  const emptyColSpan = showFollowUpColumns ? 9 : 7;

  const formatLeadDateTime = (lead) => {
    const dateValue = lead.statusChangedAt || lead.createdAt || lead.date;
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  const fieldRows = (lead = {}) => [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Status', lead.status],
    ['Service Interested', lead.service],
    ['Assigned To', lead.assigned],
    ['Lead Source', lead.leadSource],
    ['Registered Date', formatLeadDateTime(lead)],
    ['Status Changed', formatLeadDateTime({ createdAt: lead.statusChangedAt })],
    ['Follow-up Stage', getFollowUpStageLabel(lead)],
    ['Follow-up Date', formatDateOnly(getFollowUpDate(lead))],
    ['Referral Name', lead.referralName],
    ...(!isEmployee ? [['Referral Phone', lead.referralPhone]] : []),
    ['Remarks', lead.remarks],
  ];

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((prev) => ({ ...prev, lead: { ...prev.lead, [name]: value } }));
  };


  // Save handler: update lead on backend
  const handleEditSave = async () => {
    if (!editModal.lead?._id) return;
    try {
      const payload = isEmployee ? { email: editModal.lead.email } : editModal.lead;
      const res = await api.put(`/api/leads/${editModal.lead._id}`, payload);
      if (onLeadUpdated && res.data?.lead) onLeadUpdated(res.data.lead);
      toast.success('Lead updated successfully');
      setEditModal({ open: false, lead: null });
      // Optionally: refresh leads list or update UI here
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lead');
    }
  };

  return (
    <>
      <div className="overflow-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-left text-sm font-medium text-gray-700">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll || (() => { })}
                  style={{ accentColor: '#57123f', width: 18, height: 18 }}
                />
              </th>
              <th className="p-3">Name And Email</th>
              <th className="p-3">Phone & Registered</th>
              <th className="p-3">Status</th>
              {showFollowUpColumns && (
                <>
                  <th className="p-3">Follow-up</th>
                  <th className="p-3">Follow-up Date</th>
                </>
              )}
              <th className="p-3">Service Interested</th>
              <th className="p-3">Assigned To</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {leads.length > 0 ? (
              leads.map((lead) => (
                <tr key={lead._id} className="border-t">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(lead._id)}
                      onChange={() => onSelectRow(lead._id)}
                      style={{ accentColor: '#57123f', width: 18, height: 18 }}
                    />
                  </td>
                  <td className="p-2">
                    <div className="font-semibold">{lead.name}</div>
                    <div className="text-xs text-gray-700">{lead.email || '-'}</div>
                  </td>
                  <td className="p-2">
                    <div className="text-xs text-gray-700">Phone: {lead.phone || '-'}</div>
                    <div className="text-xs text-gray-500">Registered: {formatLeadDateTime(lead)}</div>
                  </td>
                  <td className="p-2">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      style={{ color: '#57123f', borderColor: '#57123f' }}
                      value={lead.status}
                      onChange={e => onStatusChange(lead._id, e.target.value)}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  {showFollowUpColumns && (
                    <>
                      <td className="p-2">
                        <span className="inline-flex rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-[#57123f]">
                          {getFollowUpStageLabel(lead)}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-gray-700">{formatDateOnly(getFollowUpDate(lead))}</td>
                    </>
                  )}
                  <td className="p-2">{lead.service}</td>
                  <td className="p-2">{lead.assigned || '-'}</td>

                  <td className="p-2 flex gap-2">
                    {showFollowUpReportAction && (
                      <button
                        className="rounded-full hover:bg-gray-100 text-[#57123f]"
                        title="Add follow-up report"
                        onClick={() => onFollowUpReport && onFollowUpReport(lead)}
                      >
                        <FaComments />
                      </button>
                    )}
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="View"
                      onClick={() => setViewModal({ open: true, lead })}
                    >
                      <FaEye />
                    </button>
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="Lead history"
                      onClick={() => setHistoryModal({ open: true, lead })}
                    >
                      <FaHistory />
                    </button>
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="Edit Lead"
                      onClick={() => setEditModal({ open: true, lead })}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`rounded-full hover:bg-gray-100 text-[#57123f] ${isEmployee ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={isEmployee ? "Employees cannot delete leads" : "Delete"}
                      disabled={isEmployee}
                      onClick={() => !isEmployee && onAction('Delete', lead)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={emptyColSpan} className="p-4 text-center text-gray-500">No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>

      </div>
      {/* Footer */}
      <div className="text-sm text-gray-500 mt-3">Showing 10 results in a Page</div>
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-lg font-bold mb-4">Edit Lead</h3>
            <div className="space-y-3">
              {!isEmployee && (
                <>
              <span className="block font-semibold mb-1">Name</span>
              <input
                type="text"
                name="name"
                value={editModal.lead?.name || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Name"
              />
                </>
              )}
              <span className="block font-semibold mb-1">Email</span>
              <input
                type="email"
                name="email"
                value={editModal.lead?.email || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder={isEmployee ? 'Enter lead email' : 'Email'}
                required
              />
              {isEmployee && (
                <p className="text-xs text-gray-500">
                  Employees can update the lead email whenever a correction is required.
                </p>
              )}
              {!isEmployee && (
                <>
              <span className="block font-semibold mb-1">Phone</span>
              <input
                type="text"
                name="phone"
                value={editModal.lead?.phone || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Phone"
              />
              <span className="block font-semibold mb-1">Service Interested</span>
              <select
                name="service"
                value={editModal.lead?.service || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Select Service Interested</option>
                {Object.keys(serviceData.prices).map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
              <span className="block font-semibold mb-1">Assigned To</span>
              <input
                type="text"
                name="assigned"
                value={editModal.lead?.assigned || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Assigned To"
              />
              <span className="block font-semibold mb-1">Remarks</span>
              <textarea
                name="remarks"
                value={editModal.lead?.remarks || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Remarks"
                rows={2}
              />
                </>
              )}
              {!isEmployee && (
                <>
              <span className="block font-semibold mb-1">Referral Name</span>
              <input
                type="text"
                name="referralName"
                value={editModal.lead?.referralName || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Referral Name"
              />
              <span className="block font-semibold mb-1">Referral Phone</span>
              <input
                type="text"
                name="referralPhone"
                value={editModal.lead?.referralPhone || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Referral Phone"
              />
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700"
                onClick={() => setEditModal({ open: false, lead: null })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-[#57123f] text-white"
                onClick={handleEditSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Modal for Eye Icon */}
      {viewModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-scroll flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FaEye className="text-[#57123f]" /> Lead Details
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Remarks:</span><br />
                <span className="text-gray-700">{viewModal.lead?.remarks || 'No remarks provided.'}</span>
              </div>
              <div>
                <span className="font-semibold">Referral Name:</span><br />
                <span className="text-gray-700">{viewModal.lead?.referralName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold">Referral Phone:</span><br />
                <span className="text-gray-700">{viewModal.lead?.referralPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold">Follow-up Reports:</span><br />
                {Array.isArray(viewModal.lead?.followUps) && viewModal.lead.followUps.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {viewModal.lead.followUps.slice().reverse().map((followUp, index) => (
                      <div key={followUp._id || index} className="rounded border border-gray-200 p-2 text-xs">
                        <div className="font-semibold text-[#57123f]">
                          {followUp.employeeName || 'Employee'} - {followUp.createdAt ? new Date(followUp.createdAt).toLocaleString() : ''}
                        </div>
                        <div className="mt-1 text-gray-700">{followUp.customerReport}</div>
                        {followUp.nextFollowUpAt && (
                          <div className="mt-1 text-gray-500">
                            Next: {new Date(followUp.nextFollowUpAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-700">No follow-up reports.</span>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700"
                onClick={() => setViewModal({ open: false, lead: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {historyModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-30 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FaHistory className="text-[#57123f]" /> Lead History
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {fieldRows(historyModal.lead).map(([label, value]) => (
                <div key={label} className="rounded border border-gray-200 p-3">
                  <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
                  <div className="mt-1 text-gray-800 whitespace-pre-wrap">{value || 'N/A'}</div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <h4 className="font-semibold text-[#57123f]">Status History</h4>
              {Array.isArray(historyModal.lead?.statusHistory) && historyModal.lead.statusHistory.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {historyModal.lead.statusHistory.slice().reverse().map((item, index) => (
                    <div key={item._id || index} className="rounded border border-gray-200 p-2 text-xs">
                      <span className="font-semibold">{item.from || 'N/A'}</span> to <span className="font-semibold">{item.to || 'N/A'}</span>
                      <span className="text-gray-500"> by {item.changedBy || 'System'} on {formatDateOnly(item.changedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600">No status history.</p>
              )}
            </div>
            <div className="mt-5">
              <h4 className="font-semibold text-[#57123f]">Follow-up Reports</h4>
              {Array.isArray(historyModal.lead?.followUps) && historyModal.lead.followUps.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {historyModal.lead.followUps.slice().reverse().map((followUp, index) => (
                    <div key={followUp._id || index} className="rounded border border-gray-200 p-3 text-sm">
                      <div className="font-semibold text-[#57123f]">
                        {followUp.employeeName || 'Employee'} - {followUp.createdAt ? new Date(followUp.createdAt).toLocaleString() : ''}
                      </div>
                      <div className="mt-1 text-gray-700">{followUp.customerReport}</div>
                      <div className="mt-1 text-xs text-gray-500">Next: {formatDateOnly(followUp.nextFollowUpAt)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600">No follow-up reports.</p>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700"
                onClick={() => setHistoryModal({ open: false, lead: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadsTable;
