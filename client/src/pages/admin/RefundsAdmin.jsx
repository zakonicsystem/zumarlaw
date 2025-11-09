import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaTrash, FaEye, FaDownload, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { zumarLogoBase64 } from '../../assets/zumarLogoBase64';

const RefundsAdmin = () => {
  const [refunds, setRefunds] = useState([]);
  // start not loading; fetchRefunds will set loading=true when actually fetching
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeaders = () => {
    // Support multiple possible storage keys and avoid sending "null"
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('employeeToken');
    return token && token !== 'null' ? { Authorization: `Bearer ${token}` } : {};
  };
  const fetchRefunds = async () => {
    setLoading(true);
    try {
      // Fetch refunds without attaching any auth header (public read)
      const res = await axios.get('https://app.zumarlawfirm.com/refund');
      setRefunds(res.data || []);
    } catch (err) {
      console.error('Failed to fetch refunds', err);
      toast.error('Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  // On mount, load refunds (unauthenticated read)
  useEffect(() => {
    fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (no token reactive behavior needed for unauthenticated fetch)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this refund? This action cannot be undone.')) return;
    try {
      // Allow public deletion (server also updated). No auth headers attached.
      await axios.delete(`https://app.zumarlawfirm.com/refund/${id}`);
      toast.success('Refund deleted');
      setRefunds(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Refund delete error', err?.response || err);
      const status = err?.response?.status;
      if (status === 404) {
        toast.error('Refund not found');
        setRefunds(prev => prev.filter(r => r._id !== id));
        return;
      }
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const generateRefundSlip = async (refund) => {
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;

      // Header: logo left, company details, title on right
      if (zumarLogoBase64) {
        try { pdf.addImage(zumarLogoBase64, 'PNG', margin, 12, 60, 60); } catch (e) { /* ignore */ }
      }

      // Company details next to logo (matches requested layout)
      pdf.setFontSize(13);
      pdf.setFont(undefined, 'bold');
      pdf.text('ZUMAR LAW ASSOCIATE', margin + 70, 16);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text('(SMC-PRIVATE) LIMITED', margin + 70, 32);
      pdf.setFontSize(9);
      pdf.text('Business Number : 04237242555', margin + 70, 46);
      pdf.text('Office No 02 Second Floor Al-Meraj Arcade Chowk', margin + 70, 58);
      pdf.text('Lahore, Pakistan', margin + 70, 70);
      pdf.text('54000', margin + 70, 82);
      pdf.text('0303-5988574', margin + 70, 94);
      pdf.text('zumarlawfirm.com', margin + 70, 106);

      // Draw a separator
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 120, pageWidth - margin, 120);

      // Details table
      const startY = 140;
      const lineH = 20;
      const labelX = margin + 8;
      const valueX = 200;

      const rows = [
        ['Name', refund.name || '-'],
        ['Email', refund.email || '-'],
        ['Phone', refund.phone || '-'],
        ['Service', refund.serviceType || '-'],
        ['Payment Date', refund.paymentDate ? new Date(refund.paymentDate).toLocaleDateString() : '-'],
        ['Notes', refund.notes || '-'],
      ];

      pdf.setFont(undefined, 'bold');
      for (let i = 0; i < rows.length; i++) {
        const y = startY + i * lineH;
        pdf.text(rows[i][0] + ':', labelX, y);
        pdf.setFont(undefined, 'normal');
        // wrap long values
        const text = String(rows[i][1] || '-');
        const split = pdf.splitTextToSize(text, pageWidth - margin - valueX - 20);
        pdf.text(split, valueX, y);
        pdf.setFont(undefined, 'bold');
      }

      // Signature area
      const sigY = startY + rows.length * lineH + 40;
      pdf.text('Authorized Signature:', labelX, sigY + 10);
      pdf.line(labelX, sigY + 18, labelX + 220, sigY + 18);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text('CEO, Zumar Law Associate (SMC-PRIVATE) LIMITED', labelX, sigY + 36);

      // Evidence: try to fetch the evidence and embed if it's an image; otherwise show a text note/link
      if (refund.evidence) {
        try {
          const evidenceUrl = `${window.location.origin}/${refund.evidence}`;
          const resp = await fetch(evidenceUrl);
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const blob = await resp.blob();
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = (e) => reject(e);
              reader.readAsDataURL(blob);
            });
            // place image below details, scale to fit
            const imgY = sigY + 70;
            const maxW = pageWidth - margin * 2;
            const imgProps = pdf.getImageProperties(dataUrl);
            const ratio = imgProps.width / imgProps.height;
            let iw = Math.min(maxW, imgProps.width);
            let ih = iw / ratio;
            if (ih > 250) { ih = 250; iw = ih * ratio; }
            pdf.addImage(dataUrl, contentType.includes('png') ? 'PNG' : 'JPEG', margin, imgY, iw, ih);
          } else {
            // not an image - print a short note with the URL
            pdf.setFontSize(10);
            pdf.text('Evidence (open in browser to view):', labelX, sigY + 60);
            const shortUrl = evidenceUrl.length > 80 ? evidenceUrl.slice(0, 77) + '...' : evidenceUrl;
            pdf.text(shortUrl, labelX, sigY + 76);
          }
        } catch (e) {
          console.warn('Could not embed evidence in PDF', e);
          pdf.setFontSize(10);
          pdf.text('Evidence: (unable to embed - check server CORS or file type)', labelX, sigY + 60);
        }
      }

      // Footer/company details
      pdf.setFontSize(9);
      pdf.text('Zumar Law Associate - Business Number: 04237242555', margin, pdf.internal.pageSize.getHeight() - 60);

      const filename = `refund-slip-${refund._id}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate refund slip', err);
      toast.error('Failed to generate PDF slip');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-[#57123f]">Refund Submissions</h2>
      <div className="bg-white rounded shadow p-4">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-2 w-full md:w-1/2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, phone, service or notes"
                  className="border px-3 py-2 rounded w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-sm text-gray-500">Clear</button>
                )}
              </div>
              <div className="text-sm text-gray-600">Showing {refunds.length} total</div>
            </div>
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = q
                ? refunds.filter(r => {
                    return [r.name, r.email, r.phone, r.serviceType, r.notes]
                      .filter(Boolean)
                      .some(f => f.toString().toLowerCase().includes(q));
                  })
                : refunds;
              if (filtered.length === 0) {
                return <div>No refunds match your search.</div>;
              }
              return (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Service</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r._id} className="border-b">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.phone}</td>
                        <td className="p-2">{r.serviceType}</td>
                        <td className="p-2">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            {r.evidence && (
                              <>
                                <a href={`/${r.evidence}`} target="_blank" rel="noreferrer" title="View evidence" className="text-[#57123f] hover:opacity-80">
                                  <FaEye />
                                </a>
                                <a href={`/${r.evidence}`} download title="Download evidence" className="text-[#57123f] hover:opacity-80">
                                  <FaDownload />
                                </a>
                                <button onClick={() => generateRefundSlip(r)} title="Download slip" className="text-[#57123f] hover:opacity-80">
                                  <FaFilePdf />
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDelete(r._id)} title="Delete refund" className="text-[#57123f] hover:opacity-80">
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default RefundsAdmin;
