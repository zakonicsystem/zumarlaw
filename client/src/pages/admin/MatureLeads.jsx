import { useState, useEffect } from 'react';
import { serviceData } from '../../data/serviceSchemas';
import axios from 'axios';
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaFileImport,
  FaArrowRight,
  FaInfoCircle,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const MatureLeads = () => {
  const [leads, setLeads] = useState([]);
  const [editModal, setEditModal] = useState({ open: false, lead: null });
  const [convertModal, setConvertModal] = useState({ open: false, lead: null });
  const [convertFields, setConvertFields] = useState({});
  const [convertFiles, setConvertFiles] = useState({});
  const [submittingConvert, setSubmittingConvert] = useState(false);
  // For dynamic member CNICs
  const [memberCnics, setMemberCnics] = useState([]); // [{front: null, back: null}]
  // For dynamic additional member details (email, phone)
  const [memberDetails, setMemberDetails] = useState([]); // [{email: '', phone: ''}]
  // Handle member details change
  const handleMemberDetailChange = (idx, field, value) => {
    setMemberDetails(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Add a new member detail field set
  const handleAddMemberDetail = () => {
    setMemberDetails(prev => [...prev, { email: '', phone: '' }]);
  };

  // Remove a member detail field set
  const handleRemoveMemberDetail = (idx) => {
    setMemberDetails(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get('https://app.zumarlawfirm.com/leads');
      setLeads(res.data);
    } catch (err) {
      setLeads([]);
    }
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const allRowIds = leads
    .filter(lead => lead.status === 'Mature')
    .map(lead => `${lead._id}`);
  const isAllSelected = selectedRows.length === allRowIds.length && allRowIds.length > 0;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedRows([]);
    else setSelectedRows(allRowIds);
  };

  const handleSelectRow = (rowId) => {
    setSelectedRows(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
  };

  const handleStatusChange = async (leadId, value) => {
    try {
      await axios.put(`https://app.zumarlawfirm.com/leads/${leadId}/status`, { status: value });
    } catch (err) { }
    setLeads(prev => {
      // Update status and remove from current page if status changes
      let updated = prev.map(lead => lead._id === leadId ? { ...lead, status: value } : lead);
      // Only keep leads with status 'Mature' in the current page
      updated = updated.filter(lead => lead.status === 'Mature');
      return updated;
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((prev) => ({ ...prev, lead: { ...prev.lead, [name]: value } }));
  };

  const handleEditSave = async () => {
    try {
      await axios.put(`https://app.zumarlawfirm.com/leads/${editModal.lead._id}`, editModal.lead);
      setLeads(prev => prev.map(l => l._id === editModal.lead._id ? { ...editModal.lead } : l));
      setEditModal({ open: false, lead: null });
      toast.success('Lead updated successfully');
    } catch (err) {
      toast.error('Failed to update lead');
    }
  };

  // Delete lead handler
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await axios.delete(`https://app.zumarlawfirm.com/leads/${leadId}`);
      setLeads(prev => prev.filter(l => l._id !== leadId));
      setSelectedRows(prev => prev.filter(id => id !== leadId));
      toast.success('Lead deleted successfully');
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  const handleAction = (type, lead) => {
    if (type === 'Edit') {
      setEditModal({ open: true, lead });
    } else if (type === 'Delete') {
      handleDeleteLead(lead._id);
    } else {
      toast.success(`${type} action triggered for ${lead.name}`);
    }
  };

  // Only show leads with status 'Mature'
  const matureLeads = leads.filter(lead => lead.status === 'Mature');

  // Get dynamic fields for selected service
  const getServiceFields = (service) => {
    return serviceData.fields[service] || [];
  };

  // Handle field change
  const handleConvertFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConvertFields(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  // Handle file change for main fields
  const handleConvertFileChange = (e) => {
    const { name, files } = e.target;
    setConvertFiles(prev => ({ ...prev, [name]: files[0] }));
  };

  // Handle member CNIC file change
  const handleMemberCnicFileChange = (idx, side, file) => {
    setMemberCnics(prev => prev.map((item, i) => i === idx ? { ...item, [side]: file } : item));
  };

  // Add a new member CNIC field set
  const handleAddMemberCnic = () => {
    setMemberCnics(prev => [...prev, { front: null, back: null }]);
  };

  // Remove a member CNIC field set
  const handleRemoveMemberCnic = (idx) => {
    setMemberCnics(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit converted lead
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setSubmittingConvert(true);
    const formData = new FormData();
    // Add lead info
    Object.entries(convertModal.lead).forEach(([key, value]) => {
      formData.append(key, value);
    });
    // Add originalLeadId for backend deletion
    if (convertModal.lead && convertModal.lead._id) {
      formData.append('originalLeadId', convertModal.lead._id);
    }
    // Add dynamic fields
    Object.entries(convertFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    // Add files
    Object.entries(convertFiles).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });
    // Add member CNIC files
    memberCnics.forEach((item, idx) => {
      if (item.front) formData.append(`memberCnic[${idx}][front]`, item.front);
      if (item.back) formData.append(`memberCnic[${idx}][back]`, item.back);
    });
    // Add member details
    memberDetails.forEach((item, idx) => {
      if (item.email) formData.append(`memberDetail[${idx}][email]`, item.email);
      if (item.phone) formData.append(`memberDetail[${idx}][phone]`, item.phone);
    });
    try {
      await axios.post('https://app.zumarlawfirm.com/convertedService', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Lead converted and submitted!');
      setConvertModal({ open: false, lead: null });
      setConvertFields({});
      setConvertFiles({});
      setMemberCnics([]);
      setMemberDetails([]);
    } catch (err) {
      toast.error('Failed to convert lead');
    } finally {
      setSubmittingConvert(false);
    }
  };

  return (
    <div className="">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-2">
        Dashboard &gt; Lead Management &gt;{' '}
        <span className="text-gray-800 font-medium">Mature Leads</span>
      </div>

      {/* Header & Buttons */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mature Leads</h2>
        <div className="flex gap-2">

          <button
            className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => window.location.href = '/admin/leads/add'}
          >
            <FaUserPlus /> Add Mature Lead
          </button>
          <button
            className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => window.location.href = '/admin/leads/import'}
          >
            <FaFileImport /> Import Leads (.csv)
          </button>
          <button
            className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg text-sm"
            onClick={() => {
              if (selectedRows.length === 0) {
                toast.error('Please select at least one lead to convert.');
                return;
              }
              // Only allow one at a time for simplicity
              const lead = matureLeads.find(l => l._id === selectedRows[0]);
              if (!lead) {
                toast.error('Selected lead not found.');
                return;
              }
              setConvertModal({ open: true, lead });
            }}
          >
            <FaArrowRight /> Convert into Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Search"
          className="border rounded-lg px-4 py-2 w-1/3"
        />
        <button className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg">
          Filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-left text-sm font-medium text-gray-700">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  style={{ accentColor: '#57123f', width: 18, height: 18 }}
                />
              </th>
              <th className="p-3">Name And Email </th>
              <th className="p-3">Phone & Registered</th>
              <th className="p-3">Status</th>
              <th className="p-3">Service Interested</th>
              <th className="p-3">Assigned To</th>
              <th className="p-3">Remarks</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {matureLeads.length > 0 ? (
              matureLeads.map((lead) => (
                <tr key={lead._id} className="border-t">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(lead._id)}
                      onChange={() => handleSelectRow(lead._id)}
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
                      onChange={e => handleStatusChange(lead._id, e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Mature">Mature</option>
                      <option value="Follow-up">Follow-up</option>
                    </select>
                  </td>
                  <td className="p-2">{lead.service}</td>
                  <td className="p-2">{lead.assigned || '-'}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1 text-sm">
                      <FaInfoCircle className="text-gray-400" />
                      {lead.remarks || 'The client is interested but …'}
                    </div>
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="View"
                      onClick={() => handleAction('View', lead.name)}
                    >
                      <FaEye />
                    </button>
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="Edit"
                      onClick={() => handleAction('Edit', lead)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="rounded-full hover:bg-gray-100 text-[#57123f]"
                      title="Delete"
                      onClick={() => handleAction('Delete', lead)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">No contacted leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-500 mt-3">Showing 10 results</div>
      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Lead</h3>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                value={editModal.lead.name || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Name"
              />
              {/* Show email input if not present or empty */}
              <input
                type="email"
                name="email"
                value={editModal.lead.email || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Email"
              />
              <input
                type="text"
                name="phone"
                value={editModal.lead.phone || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Phone"
              />
              <select
                name="service"
                value={editModal.lead.service || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Select Service Interested</option>
                {Object.keys(serviceData.prices).map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
              <input
                type="text"
                name="assigned"
                value={editModal.lead.assigned || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Assigned To"
              />
              <textarea
                name="remarks"
                value={editModal.lead.remarks || ''}
                onChange={handleEditChange}
                className="border rounded px-3 py-2 w-full"
                placeholder="Remarks"
                rows={2}
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

      {/* Convert into Client Modal */}
      {convertModal.open && convertModal.lead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-lg relative"
            style={{ maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setConvertModal({ open: false, lead: null })}
              title="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-[#57123f]">Convert Lead into Client</h2>
            <form onSubmit={handleConvertSubmit} encType="multipart/form-data" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-semibold">Name:</span> {convertModal.lead.name}</div>
                <div><span className="font-semibold">Phone:</span> {convertModal.lead.phone}</div>
                <div><span className="font-semibold">Service:</span> {convertModal.lead.service}</div>
                <div>
                  <label className="font-semibold">Price:</label>
                  <input
                    type="number"
                    name="price"
                    value={convertFields.price || ''}
                    onChange={handleConvertFieldChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Enter price for this service"
                    required
                  />
                </div>
              </div>
              <hr className="my-2" />
              <div className="font-semibold mb-2">Required Documents/Fields:</div>
              {getServiceFields(convertModal.lead.service).length === 0 && (
                <div className="text-gray-500">No extra fields required for this service.</div>
              )}
              {getServiceFields(convertModal.lead.service).map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                  <label className="font-medium text-sm">
                    {field.label || field.name}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'file' ? (
                    <input
                      type="file"
                      name={field.name}
                      accept={field.accept || '*'}
                      required={field.required}
                      onChange={handleConvertFileChange}
                    />
                  ) : field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={!!convertFields[field.name]}
                      onChange={handleConvertFieldChange}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={convertFields[field.name] || ''}
                      required={field.required}
                      onChange={handleConvertFieldChange}
                      className="border rounded px-2 py-1"
                    />
                  )}
                </div>
              ))}

              {/* Dynamic Member CNICs Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Member CNICs (if required)</span>
                  <button
                    type="button"
                    className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-semibold hover:bg-green-200"
                    onClick={handleAddMemberCnic}
                  >
                    + Add Member CNIC
                  </button>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar pr-1">
                  {memberCnics.length === 0 && (
                    <div className="text-xs text-gray-400">No member CNICs added yet.</div>
                  )}
                  {memberCnics.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-2 bg-gray-50 rounded p-2 relative">
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg font-bold"
                        onClick={() => handleRemoveMemberCnic(idx)}
                        title="Remove"
                      >
                        &times;
                      </button>
                      <div>
                        <label className="block text-xs font-medium">Front</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => handleMemberCnicFileChange(idx, 'front', e.target.files[0])}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Back</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => handleMemberCnicFileChange(idx, 'back', e.target.files[0])}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Member Details Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Additional Member Details (if required)</span>
                  <button
                    type="button"
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
                    onClick={handleAddMemberDetail}
                  >
                    + Add Member Detail
                  </button>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar pr-1">
                  {memberDetails.length === 0 && (
                    <div className="text-xs text-gray-400">No member details added yet.</div>
                  )}
                  {memberDetails.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-2 bg-blue-50 rounded p-2 relative">
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg font-bold"
                        onClick={() => handleRemoveMemberDetail(idx)}
                        title="Remove"
                      >
                        &times;
                      </button>
                      <div>
                        <label className="block text-xs font-medium">Email</label>
                        <input
                          type="email"
                          value={item.email}
                          onChange={e => handleMemberDetailChange(idx, 'email', e.target.value)}
                          className="border rounded px-2 py-1"
                          placeholder="Enter member email"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Phone</label>
                        <input
                          type="tel"
                          value={item.phone}
                          onChange={e => handleMemberDetailChange(idx, 'phone', e.target.value)}
                          className="border rounded px-2 py-1"
                          placeholder="Enter member phone"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Custom scrollbar styles for modal */}
              <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb #fff;
        }
      `}</style>

              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  className="bg-[#57123f] text-white px-6 py-2 rounded-lg font-semibold"
                  disabled={submittingConvert}
                >
                  {submittingConvert ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatureLeads;
