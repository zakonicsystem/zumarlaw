import { useState, useEffect , useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Edit, Trash2 } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BiImport } from "react-icons/bi";
import { FaMoneyBillWave, FaUser } from "react-icons/fa";
import { toast } from "react-hot-toast";

const tabs = [
  { name: "This Month", count: 0 },
  { name: "All Records", count: 0 },
  { name: "Paid", count: 0 },
  { name: "Pending", count: 0 },
];

export default function Payroll() {

  const [activeTab, setActiveTab] = useState("This Month");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [payrolls, setPayrolls] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [autoPayLoading, setAutoPayLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState('Cash');
  const perPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPayrolls = async () => {
      setLoading(true);
      try {
        const res = await axios.get("https://app.zumarlawfirm.com/payrolls");
        setPayrolls(res.data);
      } catch (err) {
        setPayrolls([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayrolls();
  }, []);

  useEffect(() => {
    // Fetch employees for Quick Salary Pay
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("https://app.zumarlawfirm.com/admin/roles", { withCredentials: true });
        setEmployeeList(res.data);
      } catch (err) {
        setEmployeeList([]);
      }
    };
    fetchEmployees();
  }, []);

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
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    const { current } = scrollRef;
    if (current) {
      current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Handle Auto Pay for selected employee
  const handleAutoPay = () => {
    if (!selectedEmp) {
      toast.error('Please select an employee to pay.');
      return;
    }
    setShowPayModal(true);
  };

  const confirmAutoPay = async () => {
    if (!selectedEmp) return;
    setAutoPayLoading(true);
    try {
      const today = new Date();
      const monthStr = today.toLocaleString('default', { month: 'long', year: 'numeric' });
      const paymentDate = today.toISOString().slice(0, 10);
      const res = await axios.post('https://app.zumarlawfirm.com/payrolls', {
        employee: selectedEmp.name,
        salary: selectedEmp.salary,
        branch: selectedEmp.branch,
        paymentDate,
        status: 'Paid',
        paymentMethod: payMethod,
        paidBy: 'arslan',
        payrollMonth: monthStr
      });
      setPayrolls(prev => [res.data, ...prev]);
      toast.success(`Auto Pay successful for ${selectedEmp.name}!`);
      setShowPayModal(false);
      setSelectedEmp(null);
    } catch (err) {
      toast.error('Auto Pay failed.');
    } finally {
      setAutoPayLoading(false);
    }
  };

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
          <button
            className={`bg-[#57123f] hover:bg-[#7a1a59] text-white px-4 py-2 rounded-full flex items-center gap-2 ${autoPayLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={autoPayLoading}
            onClick={handleAutoPay}
          >
            Auto Pay
          </button>
          <Link
            to="/admin/salary"
            className="bg-[#57123f] hover:bg-[#7a1a59] text-white px-4 py-2 rounded-full flex items-center gap-2"
          >
            Salary Page
          </Link>
      {/* Payment Method Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[320px]">
            <h3 className="text-lg font-semibold mb-4">Select Payment Method</h3>
            <div className="flex flex-col gap-3 mb-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="payMethod" value="Cash" checked={payMethod === 'Cash'} onChange={() => setPayMethod('Cash')} />
                Cash
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="payMethod" value="Bank" checked={payMethod === 'Bank'} onChange={() => setPayMethod('Bank')} />
                Bank
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="payMethod" value="Cheque" checked={payMethod === 'Cheque'} onChange={() => setPayMethod('Cheque')} />
                Cheque
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowPayModal(false)} disabled={autoPayLoading}>Cancel</button>
              <button className="px-4 py-2 rounded bg-[#57123f] text-white" onClick={confirmAutoPay} disabled={autoPayLoading}>
                {autoPayLoading ? 'Paying...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm w-full">
      <h2 className="text-lg font-semibold mb-4">Quick Salary Pay</h2>
      <div className="relative flex items-center">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="z-10 absolute left-0 bg-white rounded-full shadow p-1"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Scrollable Cards */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 px-10 py-2 scrollbar-hide"
        >
          {employeeList.map((emp, idx) => {
            const isSelected = selectedEmp && selectedEmp._id === emp._id;
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10);
            const monthStr = today.toLocaleString('default', { month: 'long', year: 'numeric' });
            return (
              <div
                key={emp._id || idx}
                className={`min-w-[120px] flex flex-col items-center border rounded-lg p-2 shadow-sm cursor-pointer transition-all duration-150 ${isSelected ? "ring-2 ring-[#57123f] bg-[#f7eaf4]" : "bg-white"}`}
                onClick={() => setSelectedEmp(emp)}
              >
                <div className="w-16 h-16 rounded-full border mb-2 bg-gray-100 flex items-center justify-center">
                  <FaUser className="text-gray-400 text-3xl" />
                </div>
                <p className="font-medium">{emp.name}</p>
                <p className="text-sm text-gray-500">{emp.branch}</p>
                {isSelected && (
                  <div className="mt-2 text-xs text-[#57123f] text-center">
                    <div>Date: {dateStr}</div>
                    <div>Month: {monthStr}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="z-10 absolute right-0 bg-white rounded-full shadow p-1"
        >
          <ChevronRight size={24} />
        </button>
      </div>
      {/* Auto Pay Button */}
  
    </div>

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
          className="border px-4 py-2 rounded w-64"
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
              <th className="p-2"><input type="checkbox" /></th>
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
                  <td className="p-2">Rs {rec.salary}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[rec.status || 'Paid']}`}>
                      {rec.status || 'Paid'}
                    </span>
                  </td>
                  <td className="p-2">{rec.branch}</td>
                  <td className="p-2">{rec.paymentMethod}</td>
                  <td className="p-2 flex gap-1 text-[#57123f]">
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
