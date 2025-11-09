import React, { useState } from 'react';
import { FaEye, FaEdit, FaTrash, FaInfoCircle } from 'react-icons/fa';
import { serviceData } from '../../data/serviceSchemas';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LeadsTable = ({
  leads = [],
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onStatusChange,
  onAction,
  statusOptions = ['New', 'Contacted', 'Mature', 'Follow-up'],
  isAllSelected = false,
  tableTitle = '',
}) => {
  const [editModal, setEditModal] = useState({ open: false, lead: null });
  const [viewModal, setViewModal] = useState({ open: false, lead: null });

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((prev) => ({ ...prev, lead: { ...prev.lead, [name]: value } }));
  };


  // Save handler: update lead on backend
  const handleEditSave = async () => {
    if (!editModal.lead?._id) return;
    try {
      await axios.put(`http://localhost:5000/leads/${editModal.lead._id}`, editModal.lead);
      toast.success('Lead updated successfully');
      setEditModal({ open: false, lead: null });
      // Optionally: refresh leads list or update UI here
    } catch (err) {
      toast.error('Failed to update lead');
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
                    <div className="text-xs text-gray-700">{lead.email}</div>
                  </td>
                  <td className="p-2">
                    <div className="text-xs text-gray-700">Phone: {lead.phone}</div>
                    <div className="text-xs text-gray-500">Registered: {lead.date || (lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '')}</div>
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
                  <td className="p-2">{lead.service}</td>
                  <td className="p-2">{lead.assigned || '-'}</td>

                  <td className="p-2 flex gap-2">
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="View"
                      onClick={() => setViewModal({ open: true, lead })}
                    >
                      <FaEye />
                    </button>
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="Edit"
                      onClick={() => setEditModal({ open: true, lead })}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="Delete"
                      onClick={() => onAction('Delete', lead)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">No leads found.</td>
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
              <span className="block font-semibold mb-1">Name</span>
              <input
                type="text"
                name="name"
                value={editModal.lead?.name || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Name"
              />
              <span className="block font-semibold mb-1">Email</span>
              <input
                type="email"
                name="email"
                value={editModal.lead?.email || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Email"
              />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
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
    </>
  );
};

export default LeadsTable;
