import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Edit, Trash2 } from "lucide-react";
import { FaMoneyBillWave, FaFilePdf } from "react-icons/fa";
import jsPDF from 'jspdf';
import ZumarLogo from '../../assets/Zumar Logo.jpg';
import { toast } from "react-hot-toast";

const tabs = [
  { name: "This Month", count: 0 },
  { name: "All Records", count: 0 },
];

export default function Payroll() {

  const [activeTab, setActiveTab] = useState("This Month");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [payrolls, setPayrolls] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRec, setPaymentRec] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentCheque, setPaymentCheque] = useState('');
  const [paymentPaidBy, setPaymentPaidBy] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  // Removed Auto Pay state variables
  const perPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const res = await axios.get("https://app.zumarlawfirm.com/admin/roles", { withCredentials: true });
        setEmployeeList(res.data);
      } catch (err) {
        setEmployeeList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchPayrolls = async () => {
      setLoading(true);
      try {
        // If filterMonth is provided (YYYY-MM), pass as query param
        const url = filterMonth ? `https://app.zumarlawfirm.com/payrolls?month=${encodeURIComponent(filterMonth)}` : 'https://app.zumarlawfirm.com/payrolls';
        const res = await axios.get(url);
        setPayrolls(res.data || []);
      } catch (err) {
        console.error('Failed to fetch payrolls', err);
        setPayrolls([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayrolls();
  }, [filterMonth]);

  const statusColor = {
    Paid: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Unpaid: "bg-red-100 text-red-700",
  };

  // Filtering logic
  const filtered = payrolls.filter((rec) => {
    const matchSearch =
      rec.employee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec._id?.includes(searchTerm);
    const matchDate = filterDate ? rec.paymentDate?.slice(0, 10) === filterDate : true;
    return matchSearch && matchDate;
  });

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payroll?")) return;
    try {
      setLoading(true);
      await axios.delete(`https://app.zumarlawfirm.com/payrolls/${id}`);
      setPayrolls((prev) => prev.filter((p) => p._id !== id));
      toast.success("Payroll deleted successfully!");
    } catch (err) {
      console.error("Delete payroll error:", err);
      toast.error(err?.response?.data?.error || "Failed to delete payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rec) => {
    setEditData(rec);
    setEditModal(true);
  };

  const openPaymentModal = (rec) => {
    setPaymentRec(rec);
    setPaymentMethod(rec.paymentMethod || 'Cash');
    setPaymentAccount(rec.accountNumber || '');
    setPaymentCheque(rec.chequeNumber || '');
    setPaymentPaidBy(rec.paidBy || '');
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentRec(null);
    setPaymentMethod('Cash');
    setPaymentAccount('');
    setPaymentCheque('');
    setPaymentPaidBy('');
    setPaymentLoading(false);
  };

  const handleMarkPaid = async () => {
    if (!paymentRec) return;
    setPaymentLoading(true);
    try {
      const updated = {
        ...paymentRec,
        status: 'Paid',
        paymentMethod,
        accountNumber: paymentMethod === 'Bank' ? paymentAccount : paymentRec.accountNumber,
        chequeNumber: paymentMethod === 'Cheque' ? paymentCheque : paymentRec.chequeNumber,
        paidBy: paymentPaidBy || paymentRec.paidBy,
        paymentDate: new Date().toISOString(),
      };
      // Update server (PUT replaces the payroll object)
      await axios.put(`https://app.zumarlawfirm.com/payrolls/${paymentRec._id}`, updated);
      setPayrolls((prev) => prev.map((p) => (p._id === paymentRec._id ? updated : p)));
      toast.success('Payment recorded and status set to Paid');
      closePaymentModal();
    } catch (err) {
      console.error('Mark paid error', err);
      toast.error('Failed to record payment');
    }
    setPaymentLoading(false);
  };

  const formatCurrency = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const handleSalarySlip = (rec) => {
    // Create a polished salary slip resembling the provided invoice
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = ZumarLogo;
    const generate = (dataUrl) => {
      try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 48; // bigger margin for breathing room
        // Header: logo left, firm info centered-right
        const topOffset = 28;
        if (dataUrl) {
          const logoW = 84; const logoH = 84; // points
          pdf.addImage(dataUrl, 'PNG', margin, topOffset, logoW, logoH);
        }
        const headerX = margin + 110;
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('ZUMAR LAW ASSOCIATE', headerX, topOffset + 10);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text('(SMC-PRIVATE) LIMITED', headerX, topOffset + 26);
        pdf.text('Business Number : 04237242555', headerX, topOffset + 40);
        pdf.text('Office No 02 Second Floor Al-Meraj Arcade Chowk', headerX, topOffset + 54);
        pdf.text('Lahore, Pakistan 54000', headerX, topOffset + 68);
        pdf.text('0303-5988574', headerX, topOffset + 82);
        pdf.text('zumarlawfirm.com', headerX, topOffset + 96);

        // Invoice/meta box on the right (visually aligned with header)
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('SALARY SLIP', pageWidth - margin - 120, topOffset + 10);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.text(`Slip No: ${(rec._id || '').slice(-8)}`, pageWidth - margin - 120, topOffset + 30);
        pdf.text(`Date: ${rec.paymentDate ? (rec.paymentDate + '').slice(0, 10) : '-'}`, pageWidth - margin - 120, topOffset + 46);
        pdf.text(`Month: ${rec.payrollMonth || '-'}`, pageWidth - margin - 120, topOffset + 62);

        // divider with more space below header
        const dividerY = topOffset + 110;
        pdf.setLineWidth(1);
        pdf.line(margin, dividerY, pageWidth - margin, dividerY);

        // Bill To / Employee block (with more vertical spacing)
        const empY = dividerY + 18;
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('EMPLOYEE', margin, empY);
        pdf.setFont(undefined, 'normal');
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  const empNameY = empY + 20;
  pdf.text(rec.employee || '-', margin, empNameY);
  // subtle underline under name
  const nameWidth = pdf.getTextWidth(rec.employee || '-');
  pdf.setLineWidth(0.8);
  pdf.line(margin, empNameY + 4, margin + nameWidth + 6, empNameY + 4);
  pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
  pdf.text(rec.branch || 'Lahore', margin, empY + 40);
  pdf.text(rec.employeeContact || rec.phone || '-', margin, empY + 56);
        let paymentInfoY = empY + 66;
        if (rec.paymentMethod) {
          pdf.text(`Method: ${rec.paymentMethod}`, margin, paymentInfoY);
          paymentInfoY += 16;
        }
        if (rec.accountNumber) {
          pdf.text(`Account #: ${rec.accountNumber}`, margin, paymentInfoY);
          paymentInfoY += 16;
        }
        if (rec.chequeNumber) {
          pdf.text(`Cheque #: ${rec.chequeNumber}`, margin, paymentInfoY);
          paymentInfoY += 16;
        }
        if (rec.paidBy) {
          pdf.text(`Paid By: ${rec.paidBy}`, margin, paymentInfoY);
          paymentInfoY += 16;
        }

        // Earnings/Deductions table header (more breathing room)
        const tableTop = Math.max(paymentInfoY + 10, dividerY + 120);
        pdf.setLineWidth(0.6);
        pdf.line(margin, tableTop - 10, pageWidth - margin, tableTop - 10);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('DESCRIPTION', margin + 4, tableTop);
        pdf.text('RATE', pageWidth / 2 - 20, tableTop);
        pdf.text('QTY', pageWidth / 2 + 40, tableTop);
        pdf.text('AMOUNT', pageWidth - margin - 60, tableTop);
        pdf.setLineWidth(0.3);
        pdf.line(margin, tableTop + 6, pageWidth - margin, tableTop + 6);

  // rows: Basic salary only (remove allowances/deductions for simplified slip)
  const rowYStart = tableTop + 28;
  pdf.setFont(undefined, 'normal');
  const salary = Number(rec.salary) || 0;
  const net = salary;

  pdf.text('Basic Salary', margin + 4, rowYStart);
  pdf.text(formatCurrency(salary), pageWidth / 2 - 20, rowYStart);
  pdf.text('1', pageWidth / 2 + 40, rowYStart);
  pdf.text(formatCurrency(salary), pageWidth - margin - 60, rowYStart);

  // totals area (simplified)
  const totalsTop = rowYStart + 44;
  pdf.setLineWidth(0.6);
  pdf.line(pageWidth / 2, totalsTop - 8, pageWidth - margin, totalsTop - 8);
  pdf.setFont(undefined, 'bold');
  pdf.text('SUBTOTAL', pageWidth - margin - 160, totalsTop);
  pdf.setFont(undefined, 'normal');
  pdf.text(formatCurrency(salary), pageWidth - margin - 60, totalsTop);

  pdf.setFont(undefined, 'bold');
  pdf.text('NET PAY', pageWidth - margin - 160, totalsTop + 28);
  pdf.setFont(undefined, 'normal');
  pdf.text(formatCurrency(net), pageWidth - margin - 60, totalsTop + 28);

        // Signature
        pdf.setLineWidth(0.3);
        pdf.line(margin, totalsTop + 90, margin + 140, totalsTop + 90);
        pdf.setFontSize(10);
        pdf.text('Authorized Signature', margin, totalsTop + 106);
        pdf.text(`Date: ${rec.paymentDate ? (rec.paymentDate + '').slice(0, 10) : '-'}`, margin + 150, totalsTop + 106);

        // Footer note
        pdf.setFontSize(9);
        pdf.text('This is a computer generated salary slip.', pageWidth / 2, totalsTop + 150, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text('In case of any error or correction in the statement, contact: 042-37242555', pageWidth / 2, totalsTop + 166, { align: 'center' });

        const fileName = `salary_slip_${(rec.employee || 'employee').replace(/[^a-z0-9]+/gi, '_')}_${rec._id?.slice(-6)}.pdf`;
        pdf.save(fileName);
        toast.success('Salary slip downloaded');
      } catch (err) {
        console.error('Salary slip error', err);
        toast.error('Failed to generate salary slip');
      }
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        generate(dataUrl);
      } catch (e) {
        console.warn('Logo conversion failed, generating without logo', e);
        generate(null);
      }
    };
    img.onerror = (e) => {
      console.warn('Logo load failed, generating PDF without logo', e);
      generate(null);
    };
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`https://app.zumarlawfirm.com/payrolls/${editData._id}`, editData);
      setPayrolls((prev) => prev.map((p) => (p._id === editData._id ? editData : p)));
      toast.success("Payroll updated successfully!");
      setEditModal(false);
      setEditData(null);
    } catch (err) {
      toast.error("Failed to update payroll");
    } finally {
      setLoading(false);
    }
  };
  // Auto Pay removed

  return (
    <div className="w-auto space-y-5 py-6 bg-white">
      <div className="text-sm text-gray-500 mb-2 px-2">
        <Link to="/admin" className="hover:underline">Dashboard</Link> &gt;{" "}
        <span className="text-[#57123f] font-semibold">Payroll</span>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Payroll Management</h2>
        <div className="space-x-2 flex">
          <Link
            to="/admin/payroll/add"
            className="bg-[#57123f] hover:bg-[#7a1a59] text-white px-4 py-2 rounded-full flex items-center gap-2"
          >
            <FaMoneyBillWave size={18} />
            Add New Salary
          </Link>
          {/* Auto Pay button removed */}
          <Link
            to="/admin/salary"
            className="bg-[#57123f] hover:bg-[#7a1a59] text-white px-4 py-2 rounded-full flex items-center gap-2"
          >
            Salary Page
          </Link>
      {/* Payment method modal removed with Auto Pay feature */}
        </div>
      </div>

      {/* Quick Salary Pay removed */}

      <div className="flex gap-3 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`px-4 py-2 rounded-full border ${activeTab === tab.name ? "bg-[#57123f] text-white" : "bg-gray-100 text-gray-800"
              }`}
          >
            {tab.name} <span className="ml-1">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-center px-2">
        <input
          type="text"
          placeholder="Search by employee name or ID"
          className="border px-4 py-2 rounded w-96"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="date"
          className="border px-4 py-2 rounded"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full min-w-[957px] text-sm text-left">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-1"><input type="checkbox" /></th>
              <th className="p-2">Employee</th>
              <th className="p-2">Date</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Branch</th>
              <th className="p-2">Method</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">Loading...</td></tr>
            ) : paginated.length > 0 ? (
              paginated.map((rec, idx) => (
                <tr key={rec._id || idx} className="border-b hover:bg-gray-50">
                  <td className="p-2"><input type="checkbox" /></td>
                  <td className="p-2">
                    <div className="font-medium">{rec.employee}</div>
                    <div className="text-gray-500 text-xs">{rec._id?.slice(-6)}</div>
                  </td>
                  <td className="p-2">{rec.paymentDate ? rec.paymentDate.slice(0, 10) : ''}</td>
                  <td className="p-2">Rs {formatCurrency(rec.salary)}</td>
                  <td className="p-2">
                    {/* Status is always clickable to view/edit payment details */}
                    <button
                      className={`px-2 cursor-pointer py-1 rounded text-xs font-medium ${rec.status === 'Paid' ? statusColor['Paid'] : statusColor['Unpaid']}`}
                      onClick={() => openPaymentModal(rec)}
                    >
                      {rec.status || 'Unpaid'}
                    </button>
                  </td>
                  <td className="p-2">{rec.branch}</td>
                  <td className="p-2">{rec.paymentMethod}</td>
                  <td className="p-2 flex items-center gap-2 text-[#57123f]">
                    <button
                      className="btn btn-sm btn-outline-secondary cursor-pointer p-1"
                      onClick={() => handleSalarySlip(rec)}
                      title="Download Salary Slip"
                    >
                      <FaFilePdf size={16} />
                    </button>
                    <Edit size={18} className="cursor-pointer" onClick={() => navigate(`/admin/payroll/add/${rec._id}`)} />
                    <Trash2 size={18} className="cursor-pointer" onClick={() => handleDelete(rec._id)} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2 px-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded border ${currentPage === i + 1 ? "bg-[#57123f] text-white" : "bg-white text-gray-700"
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && paymentRec && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Record Payment for {paymentRec.employee}</h3>
              <button className="text-gray-500" onClick={closePaymentModal}>&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border p-2 rounded">
                  <option>Cash</option>
                  <option>Bank</option>
                  <option>Cheque</option>
                </select>
              </div>
              {paymentMethod === 'Bank' && (
                <div>
                  <label className="block text-sm font-medium">Account Number</label>
                  <input value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              )}
              {paymentMethod === 'Cheque' && (
                <div>
                  <label className="block text-sm font-medium">Cheque Number</label>
                  <input value={paymentCheque} onChange={(e) => setPaymentCheque(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium">Paid By (Label)</label>
                <input value={paymentPaidBy} onChange={(e) => setPaymentPaidBy(e.target.value)} placeholder="e.g., Cashier Name or Bank Name" className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium">Amount</label>
                <input value={paymentRec.salary || ''} readOnly className="w-full border p-2 rounded bg-gray-50" />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded border" onClick={closePaymentModal}>Cancel</button>
                <button className="px-4 py-2 rounded bg-[#57123f] text-white" onClick={handleMarkPaid} disabled={paymentLoading}>{paymentLoading ? 'Saving...' : 'Mark as Paid'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md space-y-4 relative">
            <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl" onClick={() => setEditModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-[#57123f]">Edit Payroll</h2>
            <div>
              <label className="block mb-1 font-medium">Employee</label>
              <input name="employee" value={editData.employee} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Date</label>
              <input type="date" name="paymentDate" value={editData.paymentDate?.slice(0,10) || ''} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Amount</label>
              <input name="salary" value={editData.salary} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Status</label>
              <select name="status" value={editData.status} onChange={handleEditChange} className="w-full border p-2 rounded">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Branch</label>
              <input name="branch" value={editData.branch} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Method</label>
              <input name="paymentMethod" value={editData.paymentMethod} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <button type="submit" className="w-full bg-[#57123f] text-white py-2 rounded font-semibold hover:bg-[#7a1a59]">Update Payroll</button>
          </form>
        </div>
      )
      }
    </div>
  );
}
