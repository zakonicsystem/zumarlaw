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

  const formatCurrency = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const handleSalarySlip = (rec) => {
    // Load logo image and convert to dataURL, then generate PDF
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = ZumarLogo;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        // centered logo
  const logoW = 100; const logoH = 60; const logoX = (pageWidth - logoW) / 2;
  pdf.addImage(dataUrl, 'PNG', logoX, 10, logoW, logoH);
  // place title below the logo with some extra padding
  const headerY = 10 + logoH + 10;
        pdf.setFontSize(18);
        pdf.setTextColor(40,40,40);
        
        pdf.text('Salary Slip', pageWidth/2, headerY, { align: 'center' });
        // meta
        pdf.setFontSize(11);
        const metaY = headerY + 10;
        pdf.text(`Employee: ${rec.employee || '-'}`, 20, metaY);
        pdf.text(`Branch: ${rec.branch || '-'}`, 20, metaY + 8);
        pdf.text(`Payroll Month: ${rec.payrollMonth || '-'}`, 20, metaY + 16);
        pdf.text(`Payment Date: ${rec.paymentDate ? (rec.paymentDate+'').slice(0,10) : '-'}`, 20, metaY + 24);
        // salary box
        const boxY = metaY + 36;
        pdf.setDrawColor(200,200,200);
        pdf.roundedRect(15, boxY, pageWidth - 30, 40, 4, 4);
        pdf.setFontSize(12);
        pdf.text(`Basic Salary: Rs ${formatCurrency(rec.salary || 0)}`, 20, boxY + 12);
  // Paid By: fixed to zumarlawfirm and remove signature
  pdf.text(`Paid By: zumarlawfirm`, 20, boxY + 22);
  pdf.text(`Payment Method: ${rec.paymentMethod || '-'}`, 120, boxY + 12);
  pdf.text(`Status: Paid`, 120, boxY + 22);
  pdf.setFontSize(8);
  pdf.text('This is a computer generated salary slip.', pageWidth/2, boxY + 48, { align: 'center' });
        const fileName = `salary_slip_${(rec.employee||'employee').replace(/[^a-z0-9]+/gi,'_')}_${rec._id?.slice(-6)}.pdf`;
        pdf.save(fileName);
        toast.success('Salary slip downloaded');
      } catch (err) {
        console.error('Salary slip error', err);
        toast.error('Failed to generate salary slip');
      }
    };
    img.onerror = (e) => {
      console.warn('Logo load failed, generating PDF without logo', e);
      try {
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
  // fallback header when logo not available: give extra top margin
  const headerY = 30;
        pdf.setFontSize(18);
        pdf.setTextColor(40,40,40);
        pdf.text('Salary Slip', pageWidth/2, headerY, { align: 'center' });
        pdf.setFontSize(11);
        const metaY = headerY + 10;
        pdf.text(`Employee: ${rec.employee || '-'}`, 20, metaY);
        pdf.text(`Branch: ${rec.branch || '-'}`, 20, metaY + 8);
        pdf.text(`Payroll Month: ${rec.payrollMonth || '-'}`, 20, metaY + 16);
        pdf.text(`Payment Date: ${rec.paymentDate ? (rec.paymentDate+'').slice(0,10) : '-'}`, 20, metaY + 24);
        const boxY = metaY + 36;
        pdf.setDrawColor(200,200,200);
        pdf.roundedRect(15, boxY, pageWidth - 30, 40, 4, 4);
  pdf.setFontSize(12);
  pdf.text(`Basic Salary: Rs ${formatCurrency(rec.salary || 0)}`, 20, boxY + 12);
  // Paid By fixed
  pdf.setFontSize(10);
  pdf.text(`Paid By: zumarlawfirm`, 20, boxY + 36);
  // Status: Paid
  pdf.text(`Status: Paid`, 120, boxY + 22);
  const fileName = `salary_slip_${(rec.employee||'employee').replace(/[^a-z0-9]+/gi,'_')}_${rec._id?.slice(-6)}.pdf`;
        pdf.save(fileName);
        toast.success('Salary slip downloaded');
      } catch (err) {
        console.error(err);
        toast.error('Failed to generate salary slip');
      }
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
              <th className="p-2">Delete</th>
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
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor['Paid']}`}>
                      Paid
                    </span>
                  </td>
                  <td className="p-2">{rec.branch}</td>
                  <td className="p-2">{rec.paymentMethod}</td>
                  <td className="p-2 flex items-center gap-2 text-[#57123f]">
                    <button
                      className="btn btn-sm btn-outline-secondary p-1"
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
