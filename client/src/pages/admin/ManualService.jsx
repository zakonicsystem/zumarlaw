import React, { useState, useEffect, useRef } from 'react';

// Modern InvoiceContent component matching ConvertedService.jsx
import ZumarLogo from '../../assets/ZumarLogo.png';
function InvoiceContent({ invoiceData }) {
  if (!invoiceData) return null;
  // Helper to check for file/path values (move to top so it's in scope everywhere)
  const isFileOrPath = v => {
    if (typeof v !== 'string') return false;
    const lower = v.toLowerCase();
    return (
      lower.includes('uploads') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.pdf') ||
      lower.endsWith('.doc') ||
      lower.endsWith('.docx') ||
      lower.endsWith('.xls') ||
      lower.endsWith('.xlsx') ||
      lower.endsWith('.ppt') ||
      lower.endsWith('.pptx') ||
      lower.startsWith('http') ||
      lower.match(/^[a-z]:\\|^\\\\|^\//) // Windows or unix path
    );
  };
  // Helper: Render additional members (from cnicGroups or fields)
  const renderMemberDetails = () => {
    // Helper to label fields
    const labelMap = {
      email: 'Email',
      phone: 'Phone',
      memberQ: 'Member Q',
      memberq: 'Member Q',
      cnic: 'CNIC',
      name: 'Name',
      relation: 'Relation',
      // Add more as needed
    };
    if (invoiceData.fields && Array.isArray(invoiceData.fields.members) && invoiceData.fields.members.length > 0) {
      return invoiceData.fields.members.slice(0, 2).map((member, idx) => (
        <div key={idx} style={{
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          background: '#faf8fb',
          fontSize: 15,
        }}>
          <div style={{ fontWeight: 700, color: '#57123f', fontSize: 18, marginBottom: 8 }}>Member {idx + 1} Details</div>
          {Object.entries(member).map(([k, v]) => {
            if (isFileOrPath(v)) return null;
            return (
              <div key={k} style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: '#57123f', fontSize: 15 }}>{labelMap[k.toLowerCase()] || (k.charAt(0).toUpperCase() + k.slice(1))}:</span> <span style={{ color: '#444', fontSize: 15 }}>{v}</span>
              </div>
            );
          })}
        </div>
      ));
    }
    // Try cnicGroups (array of objects with front/back/other info)
    if (Array.isArray(invoiceData.cnicGroups) && invoiceData.cnicGroups.length > 0) {
      return invoiceData.cnicGroups.slice(0, 2).map((group, idx) => (
        <div key={idx} style={{
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          background: '#faf8fb',
          fontSize: 15,
        }}>
          <div style={{ fontWeight: 700, color: '#57123f', fontSize: 18, marginBottom: 8 }}>Member {idx + 1} Details</div>
          {Object.entries(group).map(([k, v]) => {
            if (k === 'front' || k === 'back') return null;
            if (isFileOrPath(v)) return null;
            return (
              <div key={k} style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: '#57123f', fontSize: 15 }}>{labelMap[k.toLowerCase()] || (k.charAt(0).toUpperCase() + k.slice(1))}:</span> <span style={{ color: '#444', fontSize: 15 }}>{v}</span>
              </div>
            );
          })}
        </div>
      ));
    }
    return null;
  };

  return (
    <div style={{
      fontFamily: 'Segoe UI, Arial, sans-serif',
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 4px 24px #0001',
      padding: '40px 48px',
      minHeight: '60vh',
      maxWidth: 700,
      width: '100%',
      margin: '0 auto',
      position: 'relative',
      overflow: 'auto',
      color: '#222',
    }}>
      {/* Header with logo and company info */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, borderBottom: '2px solid #57123f', paddingBottom: 18 }}>
        <img src={ZumarLogo} alt="Zumar Law Firm Logo" style={{ height: 56, marginRight: 24, borderRadius: 8 }} />
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#57123f', letterSpacing: 1, marginBottom: 2 }}>Zumar Law Firm</div>
          <div style={{ fontSize: 17, color: '#57123f', fontWeight: 600 }}>Legal & Tax Consultancy</div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 2 }}>www.zumarlawfirm.com | info@zumarlawfirm.com</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#57123f', letterSpacing: 1 }}>INVOICE</div>
          <div style={{ fontSize: 15, color: '#888', fontWeight: 500 }}>#{invoiceData._id?.slice(-6).toUpperCase()}</div>
        </div>
      </div>
      {/* Invoice meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <div>
          <div style={{ fontWeight: 700, color: '#57123f', fontSize: 17 }}>Billed To:</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{invoiceData.name}</div>
          <div style={{ fontSize: 15, color: '#555' }}>{invoiceData.email}</div>
          <div style={{ fontSize: 15, color: '#555' }}>{invoiceData.phone}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#57123f', fontSize: 15 }}>Date:</div>
          <div style={{ fontSize: 15 }}>{invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleDateString() : ''}</div>
          <div style={{ fontWeight: 700, color: '#57123f', fontSize: 15, marginTop: 6 }}>Status:</div>
          <div style={{ fontSize: 15, textTransform: 'capitalize' }}>{invoiceData.status || 'pending'}</div>
          <div style={{ fontWeight: 700, color: '#57123f', fontSize: 15, marginTop: 6 }}>Service:</div>
          <div style={{ fontSize: 15 }}>{invoiceData.serviceType || invoiceData.service}</div>
        </div>
      </div>
      {/* Details Table */}
      <div style={{ marginBottom: 30 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700, color: '#57123f', padding: '10px 8px', width: 140, fontSize: 16 }}>CNIC</td>
              <td style={{ padding: '10px 8px', fontSize: 16 }}>{invoiceData.cnic}</td>
            </tr>
            {/* Dynamic fields (no images, no file names, no file paths) */}
            {invoiceData.fields && Object.keys(invoiceData.fields).length > 0 && Object.entries(invoiceData.fields).map(([key, value]) => (
              key === 'members' ? null : (
                isFileOrPath(value)
                  ? null
                  : (
                    <tr key={key}>
                      <td style={{ fontWeight: 700, color: '#57123f', padding: '10px 8px', fontSize: 16 }}>{key.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '10px 8px', fontSize: 16 }}>
                        {Array.isArray(value)
                          ? value.filter(item => !isFileOrPath(item)).map((item, i) => (
                              typeof item === 'object' && item !== null
                                ? Object.entries(item).filter(([k, v]) => !isFileOrPath(v)).map(([k, v]) => (
                                    <span key={k} style={{ color: '#555', marginRight: 8 }}>{k.charAt(0).toUpperCase() + k.slice(1)}: {v} </span>
                                  ))
                                : <span key={i} style={{ color: '#555', marginRight: 8 }}>{item}</span>
                            ))
                          : typeof value === 'object' && value !== null
                            ? Object.entries(value).filter(([k, v]) => !isFileOrPath(v)).map(([k, v]) => (
                                <span key={k} style={{ color: '#555', marginRight: 8 }}>{k.charAt(0).toUpperCase() + k.slice(1)}: {v} </span>
                              ))
                            : <span style={{ color: '#555' }}>{value}</span>
                        }
                      </td>
                    </tr>
                  )
              )
            ))}
          </tbody>
        </table>
      </div>
      {/* Additional Members Section */}
      {renderMemberDetails() && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, color: '#57123f', fontSize: 20, marginBottom: 10 }}>Additional Members</div>
          {renderMemberDetails()}
        </div>
      )}
      {/* Footer */}
      <div style={{ borderTop: '1.5px solid #eee', marginTop: 36, paddingTop: 18, textAlign: 'center', color: '#888', fontSize: 15, fontWeight: 500 }}>
        Thank you for choosing Zumar Law Firm. For queries, contact us at <span style={{ color: '#57123f', fontWeight: 700 }}>info@zumarlawfirm.com</span> or visit our website.
      </div>
    </div>
  );
}
import axios from 'axios';
import { FaSearch, FaEye, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 10;

const ManualService = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Dropdown for assigning employees (copied from ServiceProcessingPage)
function AssignedToDropdown({ employees, assignedTo, onAssign }) {
  return (
    <select
      value={assignedTo || ''}
      onChange={e => onAssign(e.target.value)}
      className="bg-gray-100 text-gray-700 rounded px-2 py-1 text-xs"
    >
      <option value="">Unassigned</option>
      {employees.map(emp => (
        <option key={emp._id || emp.name} value={emp.name}>
          {emp.name}
        </option>
      ))}
    </select>
  );
}

// Status button (copied from ServiceProcessingPage)
const statusColors = {
  pending: 'bg-yellow-400 text-black',
  processing: 'bg-blue-400 text-white',
  completed: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white'
};
const statusOrder = ['pending', 'processing', 'completed', 'rejected'];
function StatusButton({ status, onClick }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const safeStatus = status || 'pending';
  const color = statusColors[safeStatus] || 'bg-gray-300 text-gray-700';
  let label = 'Unknown';
  if (typeof safeStatus === 'string') {
    label = safeStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  const handleClick = async (e) => {
    setIsAnimating(true);
    try {
      await onClick(e);
    } finally {
      setTimeout(() => setIsAnimating(false), 400);
    }
  };
  return (
    <button
      type="button"
      className={`px-3 py-1 rounded text-gray-600 text-xs font-semibold focus:outline-none transition ${color} ${isAnimating ? 'ring-2 ring-[#57123f] scale-105 shadow-lg' : ''}`}
      style={{ transition: 'all 0.3s cubic-bezier(.4,2,.6,1)' }}
      onClick={handleClick}
      disabled={isAnimating}
    >
      {label}
    </button>
  );
}
  // Fetch employees for assignment
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get('http://localhost:5000/admin/roles');
        const employeesArr = Array.isArray(res.data)
          ? res.data.filter(emp => typeof emp.name === 'string' && emp.name.trim() !== '')
          : [];
        setEmployees(employeesArr);
      } catch (err) {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // Assign employee to manual service
  const handleAssignEmployee = async (row, employeeName) => {
    try {
      await axios.patch(
        `http://localhost:5000/manualService/${row._id}/assign`,
        { assignedTo: employeeName }
      );
      setServices(prev => prev.map(r => r._id === row._id ? { ...r, assignedTo: employeeName } : r));
      toast.success('Assigned to employee');
    } catch (error) {
      toast.error('Failed to assign employee');
    }
  };

  // Cycle status and update backend
  const handleStatusCycle = async (row) => {
    const currentIdx = statusOrder.indexOf(row.status);
    const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];
    try {
      await axios.patch(
        `http://localhost:5000/manualService/${row._id}/status`,
        { status: nextStatus }
      );
      setServices(prev => prev.map(r => r._id === row._id ? { ...r, status: nextStatus } : r));
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };
  // Fetch manual service submissions from backend
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const res = await axios.get('http://localhost:5000/manualService');
        // Ensure status and assignedTo are always present for each row
        const data = Array.isArray(res.data)
          ? res.data.map(row => ({
              ...row,
              status: row.status || 'pending',
              assignedTo: typeof row.assignedTo === 'string' ? row.assignedTo : '',
            }))
          : [];
        setServices(data);
      } catch (err) {
        toast.error('Failed to fetch manual services');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Filter and search logic (defensive: always use array)
  const safeServices = Array.isArray(services) ? services : [];
  const filtered = safeServices.filter(row => {
    const matchesStatus = filterStatus ? (row.status === filterStatus) : true;
    const matchesSearch = searchQuery
      ? (
        (row.name && row.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (row.cnic && row.cnic.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      : true;
    return matchesStatus && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const currentData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Invoice modal state
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Open invoice modal for a row
  const handleOpenInvoice = (row) => {
    setInvoiceData(row);
    setShowInvoice(true);
  };

  // Close invoice modal
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceData(null);
  };


  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      setSelectedRows(currentData.map(row => row._id));
      setSelectAll(true);
    }
  };

  // Handle single row checkbox
  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedRows, id];
      setSelectedRows(newSelected);
      if (newSelected.length === currentData.length) setSelectAll(true);
    }
  };

  // Generate Invoice button handler (shows first selected row's invoice)
  const handleGenerateInvoice = () => {
    if (selectedRows.length > 0) {
      const row = currentData.find(r => r._id === selectedRows[0]);
      if (row) handleOpenInvoice(row);
      else toast.error('Selected row not found on this page.');
    } else {
      toast.error('Please select at least one row.');
    }
  };


  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#57123f] mb-6">Manual Service Submissions</h1>
        <div className="flex flex-wrap gap-4 mb-6 items-center">

          <div className="relative flex-1 max-w-sm">
            <FaSearch className="absolute left-3 top-2 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              type="text"
              placeholder="Search by Name or CNIC"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-100 text-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            className="bg-[#57123f] text-sm text-white px-6 py-2 rounded-full hover:bg-[#4a0f35] font-semibold"
            onClick={handleGenerateInvoice}
          >
            Generate Invoice
          </button>
          <input
            type="file"
            id="certificate-upload"
            style={{ display: 'none' }}
            multiple={false}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (selectedRows.length === 0) {
                toast.error('Please select at least one row.');
                return;
              }
              try {
                if (selectedRows.length === 1) {
                  // Use new single-certificate endpoint
                  const formData = new FormData();
                  formData.append('certificate', file);
                  await axios.post(`http://localhost:5000/manualService/${selectedRows[0]}/certificate`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                } else {
                  // Use batch upload for multiple
                  const formData = new FormData();
                  formData.append('certificate', file);
                  formData.append('ids', JSON.stringify(selectedRows));
                  await axios.post('http://localhost:5000/manualService/uploadCertificate', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                }
                toast.success('Certificate uploaded successfully!');
                // Refresh data
                const res = await axios.get('http://localhost:5000/manualService');
                setServices(res.data);
              } catch (err) {
                toast.error('Failed to upload certificate');
              }
              e.target.value = '';
            }}
          />
          <button
            className="bg-[#57123f] text-sm text-white px-6 py-2 rounded-full hover:bg-[#57123f] font-semibold"
            onClick={() => {
              if (selectedRows.length === 0) {
                toast.error('Please select at least one row.');
                return;
              }
              document.getElementById('certificate-upload').click();
            }}
          >
            Upload Certificate
          </button>
          <button
            className="bg-red-600 text-sm text-white px-6 py-2 rounded-full hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedRows.length === 0}
            onClick={async () => {
              if (selectedRows.length === 0) {
                toast.error('Please select at least one row.');
                return;
              }
              if (!window.confirm('Are you sure you want to delete the selected services?')) return;
              try {
                await axios.post('http://localhost:5000/manualService/deleteMany', { ids: selectedRows });
                toast.success('Selected services deleted!');
                setServices(prev => prev.filter(row => !selectedRows.includes(row._id)));
                setSelectedRows([]);
                setSelectAll(false);
              } catch (err) {
                toast.error('Failed to delete selected services');
              }
            }}
          >
            Delete Selected
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-xs text-left text-gray-800">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">Name & CNIC</th>
                <th className="px-4 py-3">Phone & Email</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-400">Loading...</td>
                </tr>
              ) : currentData.map((row, idx) => (
                <tr key={row._id} className={`hover:bg-gray-50 ${selectedRows.includes(row._id) ? 'bg-purple-100' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row._id)}
                      onChange={() => handleSelectRow(row._id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div><span className="font-semibold">{row.name || 'N/A'}</span></div>
                    <div className="text-xs text-gray-500">{row.cnic || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.phone || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{row.email || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3">{row.serviceType || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <AssignedToDropdown
                      employees={employees}
                      assignedTo={row.assignedTo}
                      onAssign={empName => handleAssignEmployee(row, empName)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusButton status={row.status} onClick={() => handleStatusCycle(row)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        title="View Certificate"
                        className="text-[#57123f] hover:text-[#a8326e]"
                        onClick={() => {
                          if (row.certificate) {
                            window.open(`/uploads/${row.certificate}`, '_blank');
                          } else {
                            toast.error('No certificate found for this service');
                          }
                        }}
                      >
                        <FaEye />
                      </button>
                      <button
                        title="Download Certificate"
                        className="text-[#57123f] hover:text-[#a8326e]"
                        onClick={() => {
                          if (row.certificate) {
                            const link = document.createElement('a');
                            link.href = `/uploads/${row.certificate}`;
                            link.download = row.certificate;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            toast.error('No certificate found for this service');
                          }
                        }}
                      >
                        <FaDownload />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {currentData.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-400">No manual services found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Invoice Modal */}
        {showInvoice && invoiceData && (
          <>
            {/* Modal overlay for user */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-0 relative animate-fade-in flex justify-center">
                <div className="bg-white p-6 rounded-xl shadow w-full flex flex-col mx-auto border border-gray-200 relative" style={{ maxWidth: 380 }}>
                  <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl z-10"
                    onClick={handleCloseInvoice}
                    style={{ background: 'white', borderRadius: '50%', width: 32, height: 32, boxShadow: '0 1px 4px #0001', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Close"
                  >
                    &times;
                  </button>
                  <h2 className="text-xl font-bold text-center mb-6 mt-2">Download Details</h2>
                  <div className="flex flex-col gap-3 mb-4">
                    <button
                      className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                      onClick={async () => {
                        // Download Invoice as PDF (optimized for smaller size)
                        const jsPDF = (await import('jspdf')).default;
                        const html2canvas = (await import('html2canvas')).default;
                        const printArea = document.getElementById('invoice-print-area');
                        if (!printArea) return toast.error('Invoice content not found');
                        // Wait for images to load
                        const images = printArea.querySelectorAll('img');
                        await Promise.all(Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; }))); 
                        await new Promise(res => setTimeout(res, 200));
                        // Fix unsupported oklch() color by overriding all color/backgroundColor styles
                        const elements = printArea.querySelectorAll('*');
                        const originalStyles = [];
                        elements.forEach(el => {
                          const style = window.getComputedStyle(el);
                          const color = style.color;
                          const bg = style.backgroundColor;
                          let changed = false;
                          if (color && color.startsWith('oklch')) {
                            el.style.color = '#222';
                            changed = true;
                          }
                          if (bg && bg.startsWith('oklch')) {
                            el.style.backgroundColor = '#fff';
                            changed = true;
                          }
                          if (changed) {
                            originalStyles.push({ el, color, bg });
                          }
                        });
                        printArea.style.background = '#fff';
                        // Lower scale for smaller PDF, and compress image
                        const canvas = await html2canvas(printArea, { scale: 1.2, useCORS: true, allowTaint: false, backgroundColor: '#fff' });
                        // Restore original styles
                        originalStyles.forEach(({ el, color, bg }) => {
                          el.style.color = color;
                          el.style.backgroundColor = bg;
                        });
                        // Compress PNG to JPEG for smaller PDF
                        const imgData = canvas.toDataURL('image/jpeg', 0.7);
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = pdf.internal.pageSize.getHeight();
                        const imgWidth = canvas.width;
                        const imgHeight = canvas.height;
                        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                        pdf.addImage(
                          imgData,
                          'JPEG',
                          (pdfWidth - imgWidth * ratio) / 2,
                          10,
                          imgWidth * ratio,
                          imgHeight * ratio
                        );
                        // Compose filename as username_service_invoice.pdf
                        const userName = (invoiceData.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                        const service = (invoiceData.serviceType || invoiceData.service || 'service').replace(/[^a-z0-9]+/gi, '_');
                        pdf.save(`${userName}_${service}_invoice.pdf`);
                        toast.success('Invoice downloaded successfully');
                      }}
                    >
                      Download Invoice
                    </button>
                    <button
                      className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                      onClick={async () => {
                        // Download all images as zip (compress to JPEG for smallest size)
                        let imageFiles = [];
                        if (invoiceData.fields) {
                          Object.entries(invoiceData.fields).forEach(([key, value]) => {
                            if (Array.isArray(value)) {
                              value.forEach(item => {
                                if (typeof item === 'string' && item.match(/\.(jpg|jpeg|png)$/i)) {
                                  imageFiles.push(item.replace(/.*uploads[\\/]/, ''));
                                }
                              });
                            } else if (typeof value === 'string' && value.match(/\.(jpg|jpeg|png)$/i)) {
                              imageFiles.push(value.replace(/.*uploads[\\/]/, ''));
                            }
                          });
                        }
                        if (invoiceData.cnicGroups && Array.isArray(invoiceData.cnicGroups)) {
                          invoiceData.cnicGroups.forEach(group => {
                            if (group.front && group.front.match(/\.(jpg|jpeg|png)$/i)) {
                              imageFiles.push(group.front.replace(/.*uploads[\\/]/, ''));
                            }
                            if (group.back && group.back.match(/\.(jpg|jpeg|png)$/i)) {
                              imageFiles.push(group.back.replace(/.*uploads[\\/]/, ''));
                            }
                          });
                        }
                        if (!imageFiles || imageFiles.length === 0) return toast.error('No images found');
                        toast('Preparing images zip...');
                        const JSZip = (await import('jszip')).default;
                        const zip = new JSZip();
                        await Promise.all(imageFiles.map(async (file) => {
                          const url = `http://localhost:5000/uploads/${encodeURIComponent(file)}`;
                          try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error('Failed to fetch ' + file);
                            const blob = await response.blob();
                            // Always convert to JPEG and compress more
                            const imgBitmap = await createImageBitmap(blob);
                            const canvas = document.createElement('canvas');
                            canvas.width = imgBitmap.width;
                            canvas.height = imgBitmap.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(imgBitmap, 0, 0);
                            // Use lower quality for smaller size
                            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.5); // 0.5 = more compression
                            const outBlob = await (await fetch(jpegDataUrl)).blob();
                            zip.file(file.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), outBlob);
                          } catch (e) {
                            // skip file if fetch fails
                          }
                        }));
                        const userName = (invoiceData.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                        const service = (invoiceData.serviceType || invoiceData.service || 'service').replace(/[^a-z0-9]+/gi, '_');
                        const zipName = `${userName}_${service}_images.zip`;
                        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(zipBlob);
                        link.download = zipName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success('Images downloaded as zip');
                      }}
                    >
                      Download All Images
                    </button>
                    <button
                      className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                      onClick={async () => {
                        // Download all document files as zip
                        const docExt = /\.(pdf|docx?|xlsx?|xls|pptx?|ppt)$/i;
                        let docFiles = [];
                        if (invoiceData.fields) {
                          const flattenAndCollect = (val) => {
                            if (typeof val === 'string' && docExt.test(val)) {
                              docFiles.push(val.replace(/.*uploads[\\/]/, ''));
                            } else if (Array.isArray(val)) {
                              val.forEach(flattenAndCollect);
                            } else if (typeof val === 'object' && val !== null) {
                              Object.values(val).forEach(flattenAndCollect);
                            }
                          };
                          Object.entries(invoiceData.fields).forEach(([key, value]) => {
                            flattenAndCollect(value);
                          });
                        }
                        if (!docFiles || docFiles.length === 0) return toast.error('No documents found');
                        toast('Preparing documents zip...');
                        const JSZip = (await import('jszip')).default;
                        const zip = new JSZip();
                        await Promise.all(docFiles.map(async (file) => {
                          const url = `http://localhost:5000/uploads/${encodeURIComponent(file)}`;
                          try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error('Failed to fetch ' + file);
                            const blob = await response.blob();
                            zip.file(file, blob);
                          } catch (e) {
                            // skip file if fetch fails
                          }
                        }));
                        const userName = (invoiceData.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                        const service = (invoiceData.serviceType || invoiceData.service || 'service').replace(/[^a-z0-9]+/gi, '_');
                        const zipName = `${userName}_${service}_documents.zip`;
                        const zipBlob = await zip.generateAsync({ type: 'blob' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(zipBlob);
                        link.download = zipName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success('Documents downloaded as zip');
                      }}
                    >
                      Download All Documents
                    </button>
                    <button
                      className="w-full bg-[#57123f] text-white rounded-lg py-2 font-semibold hover:bg-[#4a0f35] transition"
                      onClick={async () => {
                        if (!invoiceData || !invoiceData._id) return toast.error('No invoice data');
                        try {
                          await axios.post(`http://localhost:5000/manualService/${invoiceData._id}/send-invoice`);
                          toast.success('Invoice sent to user email!');
                        } catch (err) {
                          toast.error('Failed to send invoice');
                        }
                      }}
                    >
                      Send Certificate
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">Note: The files/documents can be downloaded individually.</div>
                </div>
              </div>
            </div>
            {/* Hidden print area for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '100vw', minHeight: '60vh', background: 'white', zIndex: -1 }} id="invoice-print-area">
              <InvoiceContent invoiceData={invoiceData} />
            </div>
          </>
        )}
        <div className="flex justify-end mt-4 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              disabled={currentPage === i + 1}
              className={`px-3 py-1 rounded-full text-sm ${currentPage === i + 1
                  ? 'bg-[#57123f] text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManualService;
