import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaSearch ,FaEye, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ZumarLogo from '../../assets/ZumarLogo.png';


// InvoiceContent component for both modal and print area
function InvoiceContent({ invoiceData }) {
  if (!invoiceData) return null;
  // Enhanced invoice design
  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0002', padding: '2vw', minHeight: '60vh', maxWidth: '100vw', width: '100%', position: 'relative', overflow: 'auto' }}>
      {/* Header with logo and company info */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, borderBottom: '2px solid #57123f', paddingBottom: 16 }}>
        <img src={ZumarLogo} alt="Zumar Law Firm Logo" style={{ height: 64, marginRight: 24, borderRadius: 8 }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#57123f', letterSpacing: 1 }}>Zumar Law Firm</div>
          <div style={{ fontSize: 16, color: '#57123f', fontWeight: 500 }}>Legal & Tax Consultancy</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>www.zumarlawfirm.com | info@zumarlawfirm.com</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#57123f' }}>INVOICE</div>
          <div style={{ fontSize: 13, color: '#888' }}>#{invoiceData._id?.slice(-6).toUpperCase()}</div>
        </div>
      </div>
      {/* Invoice meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#57123f' }}>Billed To:</div>
          <div style={{ fontSize: 15 }}>{invoiceData.name}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{invoiceData.email}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{invoiceData.phone}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><span style={{ fontWeight: 600, color: '#57123f' }}>Date:</span> {invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleDateString() : ''}</div>
          <div><span style={{ fontWeight: 600, color: '#57123f' }}>Status:</span> <span style={{ textTransform: 'capitalize' }}>{invoiceData.status || 'pending'}</span></div>
          <div><span style={{ fontWeight: 600, color: '#57123f' }}>Service:</span> {invoiceData.serviceType || invoiceData.service}</div>
        </div>
      </div>
      {/* Details Table */}
      <div style={{ marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, color: '#57123f', padding: 8, width: 120 }}>CNIC</td>
              <td style={{ padding: 8 }}>{invoiceData.cnic}</td>
            </tr>
            {/* Dynamic fields (user's requested style) */}
            {invoiceData.fields && Object.keys(invoiceData.fields).length > 0 && Object.entries(invoiceData.fields).map(([key, value]) => (
              <tr key={key}>
                <td style={{ fontWeight: 600, color: '#57123f', padding: 8 }}>{key.replace(/_/g, ' ')}</td>
                <td style={{ padding: 8 }}>
                  {Array.isArray(value) ? (
                    value.map((item, i) => {
                      if (typeof item === 'string' && item.match(/\.(jpg|jpeg|png)$/i)) {
                        return (
                          <img
                            key={i}
                            src={`https://app.zumarlawfirm.com/uploads/${item.replace(/.*uploads[\\/]/, '')}`}
                            alt={`Uploaded ${key} ${i + 1}`}
                            className={`h-auto border rounded mb-1 ${key.toLowerCase().includes('cnic') || key.toLowerCase().includes('document') ? 'w-full max-w-xs' : 'w-[100px]'}`}
                            style={{ maxWidth: '100%' }}
                          />
                        );
                      } else if (typeof item === 'string' && item.match(/\.pdf$/i)) {
                        return (
                          <a key={i} href={`https://app.zumarlawfirm.com/uploads/${item.replace(/.*uploads[\\/]/, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block">PDF File {i + 1}</a>
                        );
                      } else if (typeof item === 'object' && item !== null) {
                        // Render object (e.g. member details)
                        return (
                          <div key={i} className="mb-1">
                            {Object.entries(item).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 13, color: '#444' }}>
                                <span style={{ fontWeight: 500 }}>{k.charAt(0).toUpperCase() + k.slice(1)}:</span> {v}
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return <p key={i} className="text-gray-600">{String(item)}</p>;
                      }
                    })
                  ) : typeof value === 'string' && value.match(/\.(jpg|jpeg|png)$/i) ? (
                    <img
                      src={`https://app.zumarlawfirm.com/uploads/${value.replace(/.*uploads[\\/]/, '')}`}
                      alt={`Uploaded ${key}`}
                      className={`h-auto border rounded mb-1 ${key.toLowerCase().includes('cnic') || key.toLowerCase().includes('document') ? 'w-full max-w-xs' : 'w-[100px]'}`}
                      style={{ maxWidth: '100%' }}
                    />
                  ) : typeof value === 'string' && value.match(/\.pdf$/i) ? (
                    <a href={`https://app.zumarlawfirm.com/uploads/${value.replace(/.*uploads[\\/]/, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">PDF File</a>
                  ) : typeof value === 'object' && value !== null ? (
                    <div>
                      {Object.entries(value).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 13, color: '#444' }}>
                          <span style={{ fontWeight: 500 }}>{k.charAt(0).toUpperCase() + k.slice(1)}:</span> {v}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                  )}
                </td>
              </tr>
            ))}
            {/* CNIC Groups */}
            {invoiceData.cnicGroups && invoiceData.cnicGroups.length > 0 && (
              <tr>
                <td style={{ fontWeight: 600, color: '#57123f', padding: 8 }}>CNIC Members</td>
                <td style={{ padding: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {invoiceData.cnicGroups.map((group, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16 }}>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>Front:</span>
                        {group.front && group.front.replace(/\\/g, '/').includes('uploads/') ? (
                          <img src={`https://app.zumarlawfirm.com/uploads/${group.front.replace(/\\/g, '/').split('uploads/').pop().replace(/^\/+/, '')}`} alt="CNIC Front" className="w-full max-w-xs h-auto border rounded mb-1" style={{ maxWidth: '100%' }} crossOrigin="anonymous" />
                        ) : group.front ? (
                          <span>{group.front}</span>
                        ) : null}
                        <span style={{ fontWeight: 500, fontSize: 13 }}>Back:</span>
                        {group.back && group.back.replace(/\\/g, '/').includes('uploads/') ? (
                          <img src={`https://app.zumarlawfirm.com/uploads/${group.back.replace(/\\/g, '/').split('uploads/').pop().replace(/^\/+/, '')}`} alt="CNIC Back" className="w-full max-w-xs h-auto border rounded mb-1" style={{ maxWidth: '100%' }} crossOrigin="anonymous" />
                        ) : group.back ? (
                          <span>{group.back}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div style={{ borderTop: '1.5px solid #eee', marginTop: 32, paddingTop: 16, textAlign: 'center', color: '#888', fontSize: 13 }}>
        Thank you for choosing Zumar Law Firm. For queries, contact us at <span style={{ color: '#57123f', fontWeight: 500 }}>info@zumarlawfirm.com</span> or visit our website.
      </div>
    </div>
  );
}


const PAGE_SIZE = 10;



const ConvertedService = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const invoiceRef = useRef();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await axios.get('https://app.zumarlawfirm.com/convertedService');
        setLeads(res.data);
      } catch (err) {
        toast.error('Failed to fetch converted leads');
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
    // Fetch employee list from roles
    const fetchEmployees = async () => {
      try {
        const res = await axios.get('https://app.zumarlawfirm.com/admin/roles');
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

  // Filter/search logic
  const safeLeads = Array.isArray(leads) ? leads : [];
  const filtered = safeLeads.filter(row => {
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
  const currentData = filtered;

  // Select logic
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      setSelectedRows(filtered.map(row => row._id));
      setSelectAll(true);
    }
  };
  
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

  // Invoice modal logic
  const handleOpenInvoice = (row) => {
    setInvoiceData(row);
    setShowInvoice(true);
  };
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceData(null);
  };
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
        <h1 className="text-2xl font-bold text-[#57123f] mb-6">Converted Leads</h1>
       
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
            <option value="Converted">Converted</option>
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
 <button
            className="bg-[#57123f] text-white px-5 py-2 rounded-full font-semibold hover:bg-[#57123f] transition"
            onClick={() => {
              if (selectedRows.length !== 1) return toast.error('Select exactly one lead to upload certificate');
              document.getElementById('certificate-upload-input').click();
            }}
          >
            Upload Certificate
          </button>
          <input
            id="certificate-upload-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (selectedRows.length !== 1) return toast.error('Select exactly one lead');
              const formData = new FormData();
              formData.append('certificate', file);
              try {
                toast('Uploading certificate...');
                await axios.post(`https://app.zumarlawfirm.com/convertedService/${selectedRows[0]}/certificate`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Certificate uploaded');
                // Optionally refresh leads
                setLeads(prev => prev.map(l => l._id === selectedRows[0] ? { ...l, certificate: true } : l));
              } catch (err) {
                toast.error('Upload failed');
              } finally {
                e.target.value = '';
              }
            }}
          />
          <button
            className="bg-red-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-red-700 transition"
            onClick={async () => {
              if (selectedRows.length === 0) return toast.error('No leads selected');
              if (!window.confirm('Are you sure you want to delete the selected leads?')) return;
              toast('Deleting selected leads...');
              try {
                console.log('Attempting to delete IDs:', selectedRows);
                for (const id of selectedRows) {
                  try {
                    const resp = await axios.delete(`https://app.zumarlawfirm.com/convertedService/${id}`);
                    console.log(`Deleted lead ${id}:`, resp.data);
                  } catch (err) {
                    console.error(`Delete failed for ${id}:`, err?.response?.data || err.message || err);
                    toast.error(`Delete failed for ${id}: ${err?.response?.data?.message || err.message || 'Unknown error'}`);
                  }
                }
                // Refresh leads from server after deletion
                const res = await axios.get('https://app.zumarlawfirm.com/convertedService');
                setLeads(res.data);
                setSelectedRows([]);
                setSelectAll(false);
                toast.success('Selected leads deleted');
              } catch (err) {
                console.error('Delete failed:', err);
                toast.error('Delete failed: ' + (err?.response?.data?.message || err.message || 'Unknown error'));
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
                <th className="px-4 py-3">Name </th>
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
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.phone || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{row.email || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3">{row.service || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1 text-xs bg-gray-100 text-gray-700"
                      value={row.assigned || ''}
                      onChange={async (e) => {
                        const newAssigned = e.target.value;
                        try {
                          await axios.patch(`https://app.zumarlawfirm.com/convertedService/${row._id}`, { assigned: newAssigned });
                          setLeads(prev => prev.map(l => l._id === row._id ? { ...l, assigned: newAssigned } : l));
                          toast.success('Assigned to updated');
                        } catch (err) {
                          toast.error('Failed to update assigned to');
                        }
                      }}
                    >
                      <option value="">Unassigned</option>
                      {employees.map(emp => (
                        <option key={emp._id || emp.id || emp.name} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={`border rounded px-2 py-1 text-xs 
                        ${row.status === 'completed' ? 'bg-green-100 text-green-700' :
                          row.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            row.status === 'converted' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'}`}
                      value={row.status || 'converted'}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                          await axios.put(`https://app.zumarlawfirm.com/convertedService/${row._id}/status`, { status: newStatus });
                          setLeads(prev => prev.map(l => l._id === row._id ? { ...l, status: newStatus } : l));
                          toast.success('Status updated');
                        } catch (err) {
                          toast.error('Failed to update status');
                        }
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="converted">Converted</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
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
                  <td colSpan="9" className="text-center py-6 text-gray-400">No converted leads found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {/* Pagination Controls Removed: All rows shown on one page */}

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
                  <h2 className="text-xl font-bold text-center mb-6 mt-2">Download Documents</h2>
                  <div className="flex flex-col gap-3 mb-4">
                    <button
                      className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                      onClick={async () => {
                        // Download Invoice as PDF
                        const jsPDF = (await import('jspdf')).default;
                        const html2canvas = (await import('html2canvas')).default;
                        if (!invoiceRef.current) return toast.error('Invoice content not found');
                        // Wait for images to load
                        const images = invoiceRef.current.querySelectorAll('img');
                        await Promise.all(Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; }))); 
                        await new Promise(res => setTimeout(res, 300));
                        // Fix unsupported oklch() color by overriding all color/backgroundColor styles
                        const elements = invoiceRef.current.querySelectorAll('*');
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
                        invoiceRef.current.style.background = '#fff';
                        // Lower scale for smaller file size
                        const canvas = await html2canvas(invoiceRef.current, { scale: 1, useCORS: true, allowTaint: false, backgroundColor: '#fff' });
                        // Restore original styles
                        originalStyles.forEach(({ el, color, bg }) => {
                          el.style.color = color;
                          el.style.backgroundColor = bg;
                        });
                        // Compress image as JPEG for smaller PDF
                        const imgData = canvas.toDataURL('image/jpeg', 0.7); // 0.7 quality
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
                        const service = (invoiceData.service || invoiceData.serviceType || 'service').replace(/[^a-z0-9]+/gi, '_');
                        pdf.save(`${userName}_${service}_invoice.pdf`);
                        toast.success('Invoice downloaded successfully');
                      }}
                    >
                      Download Details
                    </button>
                    <button
                      className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                      onClick={async () => {
                        // Download all images in invoiceData.files, or fallback to CNIC images if not present, as a zip file (compress to JPEG for smallest size)
                        let imageFiles = [];
                        // Support files as array or object
                        if (invoiceData.files) {
                          let filesArr = [];
                          if (Array.isArray(invoiceData.files)) {
                            filesArr = invoiceData.files;
                          } else if (typeof invoiceData.files === 'object') {
                            filesArr = Object.values(invoiceData.files);
                          }
                          imageFiles = filesArr.filter(f => typeof f === 'string' && f.match(/\.(jpg|jpeg|png)$/i));
                        }
                        // fallback to CNIC images if not present
                        if ((!imageFiles || imageFiles.length === 0) && invoiceData.fields) {
                          Object.entries(invoiceData.fields).forEach(([key, value]) => {
                            if (key.toLowerCase().includes('cnic')) {
                              if (Array.isArray(value)) {
                                value.forEach(item => {
                                  if (typeof item === 'string' && item.match(/\.(jpg|jpeg|png)$/i)) {
                                    imageFiles.push(item.replace(/.*uploads[\\/]/, ''));
                                  }
                                });
                              } else if (typeof value === 'string' && value.match(/\.(jpg|jpeg|png)$/i)) {
                                imageFiles.push(value.replace(/.*uploads[\\/]/, ''));
                              }
                            }
                          });
                        }
                        if (!imageFiles || imageFiles.length === 0) return toast.error('No images found');
                        toast('Preparing zip file...');
                        // Dynamically import JSZip
                        const JSZip = (await import('jszip')).default;
                        const zip = new JSZip();
                        // Fetch all images as blobs, compress to JPEG, and add to zip
                        await Promise.all(imageFiles.map(async (file) => {
                          const fileName = file.replace(/.*uploads[\\/]/, '');
                          const url = `https://app.zumarlawfirm.com/uploads/${encodeURIComponent(fileName)}`;
                          try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error('Failed to fetch ' + fileName);
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
                            zip.file(fileName.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), outBlob);
                          } catch (e) {
                            // skip file if fetch fails
                          }
                        }));
                        // Compose zip name
                        const userName = (invoiceData.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                        const service = (invoiceData.service || invoiceData.serviceType || 'service').replace(/[^a-z0-9]+/gi, '_');
                        const zipName = `${userName}_${service}_images.zip`;
                        // Generate and download zip
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
                    {/* Show all images from invoiceData.files as a gallery */}
                    {Array.isArray(invoiceData.files) && invoiceData.files.filter(f => typeof f === 'string' && f.match(/\.(jpg|jpeg|png)$/i)).length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mt-2 mb-2">
                        {invoiceData.files.filter(f => typeof f === 'string' && f.match(/\.(jpg|jpeg|png)$/i)).map((file, idx) => (
                          <img
                            key={idx}
                            src={`https://app.zumarlawfirm.com/uploads/${file.replace(/.*uploads[\\/]/, '')}`}
                            alt={`Uploaded file ${idx + 1}`}
                            className="h-auto border rounded mb-1 max-w-[120px] max-h-[90px]"
                            style={{ objectFit: 'cover' }}
                          />
                        ))}
                      </div>
                    )}
                    <button
                      className="w-full border border-[#57123f] text-[#57123f] rounded-lg py-2 font-semibold hover:bg-[#f7f0f5] transition"
                      onClick={async () => {
                        // Download all document files from docs, files, or fields as a zip file
                        const docExt = /\.(pdf|docx?|xlsx?|xls|pptx?|ppt)$/i;
                        let docFiles = [];
                        // 1. Check docs array (new schema)
                        if (Array.isArray(invoiceData.docs) && invoiceData.docs.length > 0) {
                          docFiles = invoiceData.docs
                            .map(doc => typeof doc === 'string' ? doc : (doc?.path || doc?.filename || ''))
                            .filter(f => typeof f === 'string' && docExt.test(f))
                            .map(f => f.replace(/.*uploads[\\/]/, ''));
                        }
                        // 2. If not found, check files (array or object)
                        if ((!docFiles || docFiles.length === 0) && invoiceData.files) {
                          let filesArr = [];
                          if (Array.isArray(invoiceData.files)) {
                            filesArr = invoiceData.files;
                          } else if (typeof invoiceData.files === 'object') {
                            filesArr = Object.values(invoiceData.files);
                          }
                          docFiles = filesArr
                            .filter(f => typeof f === 'string' && docExt.test(f))
                            .map(f => f.replace(/.*uploads[\\/]/, ''));
                        }
                        // 3. Fallback: recursively search fields (old schema or extra docs)
                        if ((!docFiles || docFiles.length === 0) && invoiceData.fields) {
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
                            if (!key.toLowerCase().includes('cnic')) {
                              flattenAndCollect(value);
                            }
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
                            // skip file if fetch fails
                          }
                        }));
                        const userName = (invoiceData.name || 'user').replace(/[^a-z0-9]+/gi, '_');
                        const service = (invoiceData.service || invoiceData.serviceType || 'service').replace(/[^a-z0-9]+/gi, '_');
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
                        if (!invoiceData.email) return toast.error('No email found for this client');
                        try {
                          await axios.post(`https://app.zumarlawfirm.com/convertedService/${invoiceData._id}/send-invoice`, { email: invoiceData.email });
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
            {/* Hidden print area for PDF generation using ref */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '100vw', minHeight: '60vh', background: 'white', zIndex: -1 }}>
              <div ref={invoiceRef}>
                <InvoiceContent invoiceData={invoiceData} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConvertedService;
