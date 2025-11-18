import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaEye, FaDownload, FaUnlink } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

function InvoiceContent({ invoiceData }) {
  if (!invoiceData) return null;
  return (
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0002', padding: '2vw', minHeight: '60vh', maxWidth: '100vw', width: '100%', position: 'relative', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 16, alignItems: 'center', marginBottom: 24, borderBottom: '2px solid #57123f', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={ZumarLogo} alt="Zumar Law Firm Logo" style={{ height: 80, width: 80, objectFit: 'contain', borderRadius: 8 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#57123f', letterSpacing: 1, whiteSpace: 'normal', wordBreak: 'break-word' }}>Zumar Law Firm</div>
          <div style={{ fontSize: 14, color: '#57123f', fontWeight: 500, marginTop: 4 }}>Legal & Tax Consultancy</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 6, wordBreak: 'break-word' }}>www.zumarlawfirm.com | info@zumarlawfirm.com</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 140 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#57123f' }}>MERGED SERVICE</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>#{invoiceData._id?.slice(-6).toUpperCase()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#57123f' }}>Primary:</div>
          <div style={{ fontSize: 15 }}>{invoiceData.name || invoiceData.primaryName || 'Merged entry'}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{invoiceData.email || ''}</div>
          <div style={{ fontSize: 13, color: '#555' }}>{invoiceData.phone || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><span style={{ fontWeight: 600, color: '#57123f' }}>Merged Count:</span> {invoiceData.mergedCount || (invoiceData.mergedIds && invoiceData.mergedIds.length) || 1}</div>
          <div style={{ maxWidth: 280, marginLeft: 'auto', wordBreak: 'break-word' }}><span style={{ fontWeight: 600, color: '#57123f' }}>Services:</span> <span style={{ display: 'inline-block', maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>{invoiceData.serviceType}</span></div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, color: '#57123f', padding: 8, width: 120 }}>Merged IDs</td>
              <td style={{ padding: 8 }}>{(invoiceData.mergedIds || []).join(', ')}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#57123f', padding: 8 }}>Created</td>
              <td style={{ padding: 8 }}>{invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleString() : ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: '1.5px solid #eee', marginTop: 32, paddingTop: 16, textAlign: 'center', color: '#888', fontSize: 13 }}>
        Merged service record. For details open each underlying record in Manual Services.
      </div>
    </div>
  );
}

const MergeService = () => {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get('https://app.zumarlawfirm.com/manualService');
        setAll(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error('Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const merged = (all || []).filter(item => (item.mergedCount && item.mergedCount > 1) || (Array.isArray(item.mergedIds) && item.mergedIds.length > 1));
  const filtered = merged.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (row.name && row.name.toLowerCase().includes(q)) || (row.cnic && row.cnic.toLowerCase().includes(q)) || (row.serviceType && row.serviceType.toLowerCase().includes(q));
  });

  const openInvoice = (row) => { setInvoiceData(row); setShowInvoice(true); };
  const closeInvoice = () => { setInvoiceData(null); setShowInvoice(false); };

  const handleUnmerge = async (row) => {
    if (!window.confirm('Unmerge this record? This will attempt to restore original records on the server.')) return;
    try {
      toast('Unmerging...');
      await axios.post(`https://app.zumarlawfirm.com/manualService/${row._id}/unmerge`);
      setAll(prev => prev.filter(p => p._id !== row._id));
      toast.success('Unmerged successfully');
    } catch (err) {
      toast.error('Unmerge failed');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#57123f]">Merged Services</h1>
          <div className="relative w-[50%]">
            <FaSearch className="absolute left-3 top-2 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              type="text"
              placeholder="Search by Name, CNIC or Service"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-xs text-left text-gray-800">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 uppercase tracking-wide">
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Merged Count</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-6 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6 text-gray-400">No merged services found</td></tr>
              ) : filtered.map(row => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-semibold">{row.name || row.primaryName || 'N/A'}</div><div className="text-xs text-gray-500">{row.cnic || row._id}</div></td>
                  <td className="px-4 py-3">{row.serviceType || 'N/A'}</td>
                  <td className="px-4 py-3">{row.mergedCount || (row.mergedIds && row.mergedIds.length) || 1}</td>
                  <td className="px-4 py-3">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button title="View" className="text-[#57123f] hover:text-[#a8326e]" onClick={() => openInvoice(row)}><FaEye /></button>
                      <button title="Download all images" className="text-[#57123f] hover:text-[#a8326e]" onClick={async () => {
                        // reuse the ManualService behavior: collect images from fields and cnicGroups
                        let imageFiles = [];
                        if (row.fields) {
                          Object.entries(row.fields).forEach(([key, value]) => {
                            if (Array.isArray(value)) {
                              value.forEach(item => { if (typeof item === 'string' && item.match(/\.(jpg|jpeg|png)$/i)) imageFiles.push(item.replace(/.*uploads[\\/]/, '')); });
                            } else if (typeof value === 'string' && value.match(/\.(jpg|jpeg|png)$/i)) imageFiles.push(value.replace(/.*uploads[\\/]/, ''));
                          });
                        }
                        if (row.cnicGroups && Array.isArray(row.cnicGroups)) {
                          row.cnicGroups.forEach(group => {
                            if (group.front && group.front.match(/\.(jpg|jpeg|png)$/i)) imageFiles.push(group.front.replace(/.*uploads[\\/]/, ''));
                            if (group.back && group.back.match(/\.(jpg|jpeg|png)$/i)) imageFiles.push(group.back.replace(/.*uploads[\\/]/, ''));
                          });
                        }
                        if (!imageFiles.length) return toast.error('No images found');
                        toast('Preparing images...');
                        try {
                          const JSZip = (await import('jszip')).default;
                          const zip = new JSZip();
                          await Promise.all(imageFiles.map(async (file) => {
                            try {
                              const url = `https://app.zumarlawfirm.com/uploads/${encodeURIComponent(file)}`;
                              const response = await fetch(url);
                              if (!response.ok) throw new Error('Failed');
                              const blob = await response.blob();
                              zip.file(file.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), blob);
                            } catch (e) { /* skip */ }
                          }));
                          const link = document.createElement('a');
                          const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
                          link.href = URL.createObjectURL(zipBlob);
                          link.download = `${(row.name||'merged')}_images.zip`;
                          document.body.appendChild(link); link.click(); document.body.removeChild(link);
                          toast.success('Images downloaded');
                        } catch (e) { toast.error('Failed to prepare images'); }
                      }}><FaDownload /></button>
                      <button title="Unmerge" className="text-red-600 hover:text-red-800" onClick={() => handleUnmerge(row)}><FaUnlink /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showInvoice && invoiceData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-4 relative">
              <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-800" onClick={() => closeInvoice()}>&times;</button>
              <InvoiceContent invoiceData={invoiceData} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MergeService;
