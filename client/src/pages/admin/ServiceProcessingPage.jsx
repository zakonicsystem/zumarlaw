import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FaSearch,
  FaIdCard,
  FaFileInvoice,
  FaEye,
  FaDownload,
  FaEnvelope
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ZumarLogo from '../../assets/ZumarLogo.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Dropdown for assigning employees
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


// Dynamic status button component
const statusColors = {
  pending: 'bg-yellow-400 text-black',
  processing: 'bg-blue-400 text-white',
  completed: 'bg-green-500 text-white',
  rejected: 'bg-red-500 text-white',
};
const statusOrder = ['pending', 'processing', 'completed', 'rejected'];
const PROGRESS_OPTIONS = [
  { value: '', label: 'No Progress' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'challan_pending', label: 'Challan Pending' },
  { value: 'objection', label: 'Objection' },
  { value: 'name_reserved', label: 'Name Reserved' },
  { value: 'file_submitted', label: 'File Submitted' },
  { value: 'objection_resolved', label: 'Objection Resolved' },
  { value: 'incorporated', label: 'Incorporated' },
  { value: 'case_holding', label: 'Case Holding' },
  { value: 'case_rejected', label: 'Case Rejected' },
  { value: 'case_refund', label: 'Case Refund' },
];



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
      setTimeout(() => setIsAnimating(false), 400); // Animation duration
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

const paymentColors = {
  pending: 'bg-gray-300 text-gray-700',
  advance: 'bg-orange-400 text-white',
  full: 'bg-green-600 text-white',
};
const paymentOrder = ['pending', 'advance', 'full'];

function PaymentStatusButton({ paymentStatus, onClick }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const safeStatus = paymentStatus || 'pending';
  const color = paymentColors[safeStatus] || 'bg-gray-300 text-gray-700';
  let label = 'Unknown';
  if (safeStatus === 'full') label = 'Complete';
  else if (safeStatus === 'advance') label = 'Advance';
  else label = 'Pending';
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
      className={`px-3 py-1 rounded text-xs font-semibold focus:outline-none transition ${color} ${isAnimating ? 'ring-2 ring-[#57123f] scale-105 shadow-lg' : ''}`}
      style={{ transition: 'all 0.3s cubic-bezier(.4,2,.6,1)' }}
      onClick={handleClick}
      disabled={isAnimating}
    >
      {label}
    </button>
  );
}


const ServiceProcessingPage = () => {
  // Removed token and role-based access control

  const invoiceRef = useRef();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProgress, setFilterProgress] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  // Certificate modal state
  const [certificateModal, setCertificateModal] = useState({ open: false, certUrl: '' });
  const [selectAll, setSelectAll] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageType, setMessageType] = useState('alert');
  const [messageText, setMessageText] = useState('');
  const [messageRow, setMessageRow] = useState(null);
  const itemsPerPage = 6;



  // Get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // helper: try request with auth, if 401 retry without auth so admin UI can override expired token
  const adminRequest = async (opts) => {
    // opts: { method, url, data, config }
    try {
      return await axios({
        method: opts.method || 'get',
        url: opts.url,
        data: opts.data,
        ...opts.config,
        headers: { ...(opts.config && opts.config.headers ? opts.config.headers : {}), ...getAuthHeaders() }
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // retry without auth
        return await axios({ method: opts.method || 'get', url: opts.url, data: opts.data, ...opts.config });
      }
      throw err;
    }
  };

  // Fetch employees for assignment
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get('https://app.zumarlawfirm.com/admin/roles', { headers: getAuthHeaders() });
        console.log('Employees API response:', res.data); // Debug log
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

  // Fetch services
  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line
  }, []);

  // Update progress status for a service (admin)
  const handleProgressChange = async (row, newProgress) => {
    try {
      await adminRequest({ method: 'patch', url: `https://app.zumarlawfirm.com/admin/services/${row._id}/progress`, data: { progressStatus: newProgress } });
      // refresh data
      fetchServices();
      toast.success('Progress status updated');
    } catch (err) {
      console.error('Failed to update progress status', err);
      toast.error('Failed to update progress status');
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://app.zumarlawfirm.com/admin/services', { headers: getAuthHeaders() });
      setServices(res.data);
    } catch (err) {
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  // Removed getAuthHeaders, no longer needed




  // Assign employee to service
  const handleAssignEmployee = async (row, employeeName) => {
    try {
      await adminRequest({
        method: 'patch',
        url: `https://app.zumarlawfirm.com/admin/services/${row._id}/assign`,
        data: { assignedTo: employeeName }
      });
      fetchServices();
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
      const primaryUrl = `https://app.zumarlawfirm.com/admin/services/${row._id}/status`;
      const altUrl = `https://app.zumarlawfirm.com/admin/services/status/${row._id}`;
      try {
        await adminRequest({ method: 'patch', url: primaryUrl, data: { status: nextStatus } });
      } catch (err) {
        // If primary endpoint not found, try alternate endpoint
        if (err.response && err.response.status === 404) {
          await adminRequest({ method: 'patch', url: altUrl, data: { status: nextStatus } });
        } else {
          throw err;
        }
      }
      fetchServices();
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Cycle payment status
  const handlePaymentStatusCycle = async (row) => {
    const currentIdx = paymentOrder.indexOf(row.paymentStatus || 'pending');
    const nextStatus = paymentOrder[(currentIdx + 1) % paymentOrder.length];
    try {
      await adminRequest({ method: 'patch', url: `https://app.zumarlawfirm.com/admin/services/${row._id}/payment-status`, data: { paymentStatus: nextStatus } });
      fetchServices();
      toast.success('Payment status updated');
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };


  // Handle single row checkbox (by id)
  const handleCheckboxChange = (row) => {
    const alreadySelected = selectedRows.includes(row._id);
    let updatedSelection;
    if (alreadySelected) {
      updatedSelection = selectedRows.filter(id => id !== row._id);
    } else {
      updatedSelection = [...selectedRows, row._id];
    }
    setSelectedRows(updatedSelection);
    // Set selectedRow to the last selected one for actions like invoice/certificate
    if (!alreadySelected) {
      setSelectedRow(row);
    } else if (updatedSelection.length === 0) {
      setSelectedRow(null);
    } else {
      setSelectedRow(row); // Always set to last toggled
    }
    if (updatedSelection.length === currentData.length) setSelectAll(true);
    else setSelectAll(false);
  };



  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      setSelectedRows(currentData.map(row => row._id));
      setSelectAll(true);
    }
  };


  const handleCertificateUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedRow) {
      toast.error('Please select a file and a service row.');
      return;
    }
    const formData = new FormData();
    formData.append('certificate', selectedFile);

    try {
      await adminRequest({ method: 'post', url: `https://app.zumarlawfirm.com/admin/services/${selectedRow._id}/certificate?pending=true`, data: formData, config: { headers: { 'Content-Type': 'multipart/form-data' } } });
      toast.success('Certificate uploaded (pending, not sent to user)');
      setShowUploadModal(false);
      setSelectedFile(null);
      fetchServices();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload certificate');
    }
  };
  const waitForImagesToLoad = (element) => {
    const images = element.querySelectorAll('img');
    const promises = Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) resolve();
          else img.onload = resolve;
        })
    );
    return Promise.all(promises);
  };


  const handleGenerateInvoice = async () => {
    if (!selectedRow) {
      toast.error("Please select a service row");
      return;
    }

    const element = invoiceRef.current;

    // 🧽 Clean unsupported colors (oklch)
    const cleanUnsupportedColors = (el) => {
      const nodes = el.querySelectorAll('*');
      nodes.forEach((node) => {
        const style = getComputedStyle(node);
        if (style.color.includes('oklch')) node.style.color = '#000';
        if (style.backgroundColor.includes('oklch')) node.style.backgroundColor = '#fff';
      });
    };

    // ⏳ Wait for images to load
    const waitForImagesToLoad = async (el) => {
      const images = el.querySelectorAll('img');
      const promises = Array.from(images).map((img) => {
        return new Promise((resolve) => {
          if (img.complete) resolve();
          else img.onload = resolve;
        });
      });
      await Promise.all(promises);
    };

    try {
      cleanUnsupportedColors(element);
      await waitForImagesToLoad(element);
      await new Promise((res) => setTimeout(res, 300)); // Give time for modal to fully render

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      pdf.addImage(
        imgData,
        'PNG',
        (pdfWidth - imgWidth * ratio) / 2,
        10,
        imgWidth * ratio,
        imgHeight * ratio
      );

      pdf.save(`invoice-${selectedRow.serviceTitle || 'service'}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error("Failed to generate PDF");
    }
  };


  // Delete selected rows (multi-delete)
  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return toast.error('Please select at least one row.');
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`)) return;
    try {
      await adminRequest({ method: 'post', url: 'https://app.zumarlawfirm.com/invoices/delete-multiple', data: { ids: selectedRows } });
      toast.success('Selected services deleted!');
      setServices(prev => prev.filter(row => !selectedRows.includes(row._id)));
      setSelectedRows([]);
      setSelectAll(false);
    } catch (err) {
      toast.error('Failed to delete selected services');
    }
  };


  // Defensive: always use array
  const safeServices = Array.isArray(services) ? services : [];
  const filteredData = safeServices.filter(item =>
    (item.personalId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.personalId?.cnic?.includes(searchQuery)) &&
    (filterStatus ? item.status === filterStatus : true) &&
    (filterProgress ? item.progressStatus === filterProgress : true)
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#57123f]">Service Processing</h1>
       
          </div>
          <div className="relative w-80">
            <FaSearch className="absolute left-3 top-2 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              type="text"
              placeholder="Search by Name or CNIC"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <select
            value={filterProgress}
            onChange={(e) => { setFilterProgress(e.target.value); setCurrentPage(1); }}
            className="bg-gray-100 text-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none"
          >
            <option value="">All Progress</option>
            {PROGRESS_OPTIONS.map(opt => (
              opt.value ? <option key={opt.value} value={opt.value}>{opt.label}</option> : null
            ))}
          </select>

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
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => {
              if (!selectedRow) return toast.error("No row selected");
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-full text-sm"
          >
            <FaIdCard /> Upload Certificate
          </button>

          <button
            onClick={() => {
              if (!selectedRow) return toast.error("No row selected");
              setShowInvoiceModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${selectedRow ? 'bg-[#57123f] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            disabled={!selectedRow}
          >
            <FaFileInvoice /> Generate Invoice
          </button>

          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedRows.length === 0}
          >
            🗑️ Delete Selected
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200 max-h-[400px]">
          <table className="w-full lg:text-[11px] md:text-[10px] text-left text-gray-800">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 uppercase tracking-wide">
                <th className="px-3 py-3">
                  <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                </th>
                <th className="px-3 py-3">Name & CNIC</th>
                <th className="px-3 py-3">Email & Phone</th>
                <th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Assigned To</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-400">Loading...</td>
                </tr>
              ) : currentData.map((row) => (
                <tr
                  key={row._id}
                  className={`transition-all ${selectedRows.some(r => r._id === row._id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row._id)}
                      onChange={() => handleCheckboxChange(row)}
                    />
                  </td>
                  <td className="px-3 py-3 min-w-[120px] align-top">
                    <div className="grid grid-cols-1 gap-x-2 gap-y-1">
                      <div>
                        <span className="font-semibold text-gray-900 text-[11px] block" title={row.personalId?.name || ''}>
                          {row.personalId?.name || 'N/A'}
                        </span>
                        <span className="text-gray-500 text-[11px] block" title={row.personalId?.cnic || ''}>
                          {row.personalId?.cnic || 'N/A'}
                        </span>

                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 min-w-[120px] align-top">
                    <div className="grid grid-cols-1 gap-x-2 gap-y-1">
                      <div>
                        <span className="text-gray-900 font-semibold text-[11px] block max-w-[120px]" title={row.personalId?.email || ''}>
                          {row.personalId?.email || 'N/A'}
                        </span>
                        <span className="text-gray-500 text-[11px] block" title={row.personalId?.phone || ''}>
                          {row.personalId?.phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3" title={row.serviceTitle || ''}>{row.serviceTitle || 'N/A'}
                    
                  </td>
                  <td className="px-3 py-3" title={row.assignedTo || ''}>
                    <AssignedToDropdown
                      employees={employees}
                      assignedTo={row.assignedTo}
                      onAssign={empName => handleAssignEmployee(row, empName)}
                    />
                    <div className="mt-2">
                      <select
                        value={row.progressStatus || ''}
                        onChange={(e) => handleProgressChange(row, e.target.value)}
                        className="text-xs bg-gray-100 rounded px-2 py-1 mt-1"
                      >
                        {PROGRESS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-3 ">
                    <StatusButton status={row.status} onClick={() => handleStatusCycle(row)} />
                  </td>
                  <td className="px-3 py-3">
                    <PaymentStatusButton paymentStatus={row.paymentStatus || 'pending'} onClick={() => handlePaymentStatusCycle(row)} />
                  </td>
                  <td className="px-3 py-3">
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
                      <button
                        title="Send Message"
                        className="text-[#57123f] hover:text-[#a8326e]"
                        onClick={() => {
                          setMessageRow(row);
                          setShowMessageModal(true);
                        }}
                      >
                        <FaEnvelope />
                      </button>
                    </div>
                    {/* Removed certificate modal logic. FaEye now opens certificate in new tab. */}
                  </td>
                </tr>
              ))}
              {currentData.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-400">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showMessageModal && messageRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={() => setShowMessageModal(false)}
              title="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-bold mb-4 text-[#57123f]">Send Message</h2>
            <div className="mb-4">
              <label className="block font-medium mb-1">Message Type</label>
              <select
                value={messageType}
                onChange={e => setMessageType(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="alert">Alert</option>
                <option value="update">Update</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Message</label>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={4}
                placeholder="Type your message here..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded-full"
                onClick={() => setShowMessageModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-[#57123f] text-white px-4 py-2 rounded-full"
                onClick={async () => {
                  try {
                    console.log('Sending message to userId:', messageRow.userId, 'serviceId:', messageRow._id); // Debug
                    await adminRequest({
                      method: 'post', url: 'https://app.zumarlawfirm.com/serviceMessage', data: {
                        userId: messageRow.userId,
                        serviceId: messageRow._id, // Use _id as serviceId
                        type: messageType,
                        message: messageText,
                      }
                    });
                    toast.success('Message sent!');
                    setShowMessageModal(false);
                    setMessageText('');
                  } catch (err) {
                    toast.error('Failed to send message');
                  }
                }}
                disabled={!messageText.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
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

      {/* Upload Certificate Modal */}
      {showUploadModal && selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Upload Certificate</h2>
            <form onSubmit={handleCertificateUpload}>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                required
                className="w-full mb-4 border p-2 rounded-md"
                accept=".pdf,.doc,.docx"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 border rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#57123f] text-white px-4 py-2 rounded-full"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Invoice Modal */}
      {showInvoiceModal && selectedRow && (
        <>
          {/* Modal overlay for user */}
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-0 relative animate-fade-in flex justify-center">
              <div className="bg-white p-6 rounded-xl shadow w-full flex flex-col mx-auto border border-gray-200 relative" style={{ maxWidth: 380 }}>
                <button
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl z-10"
                  onClick={() => setShowInvoiceModal(false)}
                  style={{ background: 'white', borderRadius: '50%', width: 32, height: 32, boxShadow: '0 1px 4px #0001', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Close"
                >
                  &times;
                </button>
                <h2 className="text-xl font-bold text-center mb-6 mt-2">Download Invoice</h2>
                <div className="flex flex-col gap-3 mb-4">
                  <button
                    className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                    onClick={async () => {
                      const jsPDF = (await import('jspdf')).default;
                      const html2canvas = (await import('html2canvas')).default;
                      const printArea = document.getElementById('invoice-print-area');
                      if (!printArea) return toast.error('Invoice content not found');
                      const images = printArea.querySelectorAll('img');
                      await Promise.all(Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; })));
                      await new Promise(res => setTimeout(res, 200));
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
                      const canvas = await html2canvas(printArea, { scale: 1.2, useCORS: true, allowTaint: false, backgroundColor: '#fff' });
                      originalStyles.forEach(({ el, color, bg }) => {
                        el.style.color = color;
                        el.style.backgroundColor = bg;
                      });
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
                      const userName = (selectedRow.personalId?.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                      const service = (selectedRow.serviceTitle || 'service').replace(/[^a-z0-9]+/gi, '_');
                      pdf.save(`${userName}_${service}_invoice.pdf`);
                      toast.success('Invoice downloaded successfully');
                    }}
                  >
                    Download Details
                  </button>
                  <button
                    className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                    onClick={async () => {
                      let imageFiles = [];
                      if (selectedRow.formFields) {
                        Object.entries(selectedRow.formFields).forEach(([key, value]) => {
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
                      if (!imageFiles || imageFiles.length === 0) return toast.error('No images found');
                      toast('Preparing images zip...');
                      const JSZip = (await import('jszip')).default;
                      const zip = new JSZip();
                      await Promise.all(imageFiles.map(async (file) => {
                        const url = `https://app.zumarlawfirm.com/uploads/${encodeURIComponent(file)}`;
                        try {
                          const response = await fetch(url);
                          if (!response.ok) throw new Error('Failed to fetch ' + file);
                          const blob = await response.blob();
                          zip.file(file, blob);
                        } catch (e) {
                        }
                      }));
                      const userName = (selectedRow.personalId?.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                      const service = (selectedRow.serviceTitle || 'service').replace(/[^a-z0-9]+/gi, '_');
                      const zipName = `${userName}_${service}_images.zip`;
                      const zipBlob = await zip.generateAsync({ type: 'blob' });
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
                      const docExt = /\.(pdf|docx?|xlsx?|xls|pptx?|ppt)$/i;
                      let docFiles = [];
                      if (selectedRow.formFields) {
                        const flattenAndCollect = (val) => {
                          if (typeof val === 'string' && docExt.test(val)) {
                            docFiles.push(val.replace(/.*uploads[\\/]/, ''));
                          } else if (Array.isArray(val)) {
                            val.forEach(flattenAndCollect);
                          } else if (typeof val === 'object' && val !== null) {
                            Object.values(val).forEach(flattenAndCollect);
                          }
                        };
                        Object.entries(selectedRow.formFields).forEach(([key, value]) => {
                          flattenAndCollect(value);
                        });
                      }
                      if (!docFiles || docFiles.length === 0) return toast.error('No documents found');
                      toast('Preparing documents zip...');
                      const JSZip = (await import('jszip')).default;
                      const zip = new JSZip();
                      await Promise.all(docFiles.map(async (file) => {
                        const url = `https://app.zumarlawfirm.com/uploads/${encodeURIComponent(file)}`;
                        try {
                          const response = await fetch(url);
                          if (!response.ok) throw new Error('Failed to fetch ' + file);
                          const blob = await response.blob();
                          zip.file(file, blob);
                        } catch (e) {
                        }
                      }));
                      const userName = (selectedRow.personalId?.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                      const service = (selectedRow.serviceTitle || 'service').replace(/[^a-z0-9]+/gi, '_');
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
                      if (!selectedRow) return toast.error('No row selected');
                      const userEmail = selectedRow.personalId?.email;
                      if (!userEmail) return toast.error('No user email found for this service');
                      try {
                        await adminRequest({ method: 'post', url: `https://app.zumarlawfirm.com/admin/services/${selectedRow._id}/send-invoice`, data: { email: userEmail } });
                        toast.success('Invoice, certificate, images, and documents sent to user dashboard and email!');
                        fetchServices();
                      } catch (err) {
                        const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to send invoice/certificate';
                        toast.error(msg);
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
            {/* Reuse the detailed invoice content for PDF/print here */}
            <div className="text-black font-sans p-6" style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'white', boxSizing: 'border-box' }}>
              {/* Header with logo and firm info */}
              <div className="flex items-center mb-8 border-b-2 border-[#57123f] pb-4">
                <img src={ZumarLogo} alt="Zumar Law Firm Logo" className="h-16 w-16 rounded-lg mr-6" />
                <div>
                  <div className="text-2xl font-bold text-[#57123f] tracking-wide">Zumar Law Firm</div>
                  <div className="text-base text-[#57123f] font-medium">Legal & Tax Consultancy</div>
                  <div className="text-xs text-gray-500 mt-1">www.zumarlawfirm.com | info@zumarlawfirm.com</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-lg font-semibold text-[#57123f]">INVOICE</div>
                  <div className="text-xs text-gray-500">#{selectedRow._id?.slice(-6).toUpperCase()}</div>
                </div>
              </div>
              {/* Invoice meta */}
              <div className="flex justify-between mb-6">
                <div>
                  <div className="font-semibold text-[#57123f]">Billed To:</div>
                  <div className="text-base">{selectedRow.personalId?.name}</div>
                  <div className="text-xs text-gray-600">{selectedRow.personalId?.email}</div>
                  <div className="text-xs text-gray-600">{selectedRow.personalId?.phone}</div>
                </div>
                <div className="text-right">
                  <div><span className="font-semibold text-[#57123f]">Date:</span> {new Date().toLocaleDateString()}</div>
                  <div><span className="font-semibold text-[#57123f]">Status:</span> <span className="capitalize">{selectedRow.status || 'pending'}</span></div>
                  <div><span className="font-semibold text-[#57123f]">Service:</span> {selectedRow.serviceTitle}</div>
                </div>
              </div>
              {/* Details Table */}
              <div className="mb-8">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    <tr>
                      <td className="font-semibold text-[#57123f] py-2 px-3 w-32">CNIC</td>
                      <td className="py-2 px-3">{selectedRow.personalId?.cnic}</td>
                    </tr>
                    {selectedRow.formFields && Object.entries(selectedRow.formFields).flatMap(([key, value]) => {
                      // List of keys to remove (case-insensitive, ignore underscores)
                      const removeKeys = [
                        'cnic members front',
                        'cnic members back',
                        'qualification',
                        'certificates',
                        'executive body list',
                        'rent agreement',
                        'cnicgroups'
                      ];
                      // Helper to normalize key for comparison
                      const normalize = s => s.replace(/_/g, ' ').toLowerCase();
                      // Remove unwanted main keys
                      if (removeKeys.includes(normalize(key))) {
                        return null;
                      }
                      // Special handling for cnicGroups[0][front/back]
                      if (normalize(key) === 'cnicgroups' && Array.isArray(value) && value.length > 0) {
                        // Remove front/back fields from first group
                        const filteredEntries = Object.entries(value[0]).filter(([k, v]) => {
                          const nk = k.replace(/_/g, ' ').toLowerCase();
                          // Remove front/back and any file fields
                          if (nk === 'front' || nk === 'back') return false;
                          if (typeof v === 'string' && (v.match(/\.(jpg|jpeg|png)$/i) || v.match(/\.pdf$/i))) return false;
                          return true;
                        });
                        if (filteredEntries.length === 0) return null;
                        return [
                          <tr key={key}>
                            <td className="font-semibold text-[#57123f] py-2 px-3">{key.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-3">
                              {filteredEntries.map(([k, v], i) => (
                                <div key={k} className="text-xs text-gray-700"><span className="font-medium">{k.charAt(0).toUpperCase() + k.slice(1)}:</span> {v}</div>
                              ))}
                            </td>
                          </tr>
                        ];
                      }
                      if (key === 'additionalMembers' && Array.isArray(value)) {
                        return value.flatMap((member, idx) => {
                          // Remove unwanted member fields and file fields
                          const filteredMember = Object.entries(member).filter(([mKey, mVal]) => {
                            const nmKey = mKey.replace(/_/g, ' ').toLowerCase();
                            if (removeKeys.includes(nmKey)) return false;
                            if (typeof mVal === 'string' && (mVal.match(/\.(jpg|jpeg|png)$/i) || mVal.match(/\.pdf$/i))) return false;
                            return true;
                          });
                          if (filteredMember.length === 0) return null;
                          return [
                            <tr key={`member-${idx}`}>
                              <td className="font-semibold text-[#57123f] py-2 px-3" colSpan={2}>
                                {`Member ${idx + 1} Detail`}
                              </td>
                            </tr>,
                            ...filteredMember.map(([mKey, mVal]) => (
                              <tr key={`member-${idx}-${mKey}`}>
                                <td className="font-semibold text-[#57123f] py-2 px-3">{mKey.replace(/_/g, ' ')}</td>
                                <td className="py-2 px-3">
                                  <span className="text-gray-600">{typeof mVal === 'string' ? mVal : JSON.stringify(mVal)}</span>
                                </td>
                              </tr>
                            ))
                          ];
                        });
                      } else {
                        // If the value is a file (image/pdf), skip rendering
                        if (typeof value === 'string' && (value.match(/\.(jpg|jpeg|png)$/i) || value.match(/\.pdf$/i))) {
                          return null;
                        }
                        // If the value is an array, filter out file fields
                        if (Array.isArray(value)) {
                          const filteredItems = value.filter(item => !(typeof item === 'string' && (item.match(/\.(jpg|jpeg|png)$/i) || item.match(/\.pdf$/i))));
                          if (filteredItems.length === 0) return null;
                          return filteredItems.map((item, i) => (
                            <tr key={`${key}-${i}`}>
                              <td className="font-semibold text-[#57123f] py-2 px-3">{key.replace(/_/g, ' ')}</td>
                              <td className="py-2 px-3">
                                {typeof item === 'object' && item !== null ? (
                                  Object.entries(item).map(([k, v]) => (
                                    <div key={k} className="text-xs text-gray-700"><span className="font-medium">{k.charAt(0).toUpperCase() + k.slice(1)}:</span> {v}</div>
                                  ))
                                ) : (
                                  <span className="text-gray-600">{String(item)}</span>
                                )}
                              </td>
                            </tr>
                          ));
                        }
                        // If the value is an object, show its entries (skip file fields)
                        if (typeof value === 'object' && value !== null) {
                          const filteredObj = Object.entries(value).filter(([k, v]) => !(typeof v === 'string' && (v.match(/\.(jpg|jpeg|png)$/i) || v.match(/\.pdf$/i))));
                          if (filteredObj.length === 0) return null;
                          return (
                            <tr key={key}>
                              <td className="font-semibold text-[#57123f] py-2 px-3">{key.replace(/_/g, ' ')}</td>
                              <td className="py-2 px-3">
                                {filteredObj.map(([k, v]) => (
                                  <div key={k} className="text-xs text-gray-700"><span className="font-medium">{k.charAt(0).toUpperCase() + k.slice(1)}:</span> {v}</div>
                                ))}
                              </td>
                            </tr>
                          );
                        }
                        // Otherwise, show the text value
                        return (
                          <tr key={key}>
                            <td className="font-semibold text-[#57123f] py-2 px-3">{key.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-3">
                              <span className="text-gray-600">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="border-t pt-4 text-center text-xs text-gray-500">
                Thank you for choosing Zumar Law Firm. For queries, contact us at <span className="text-[#57123f] font-medium">info@zumarlawfirm.com</span> or visit our website.
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default ServiceProcessingPage;
