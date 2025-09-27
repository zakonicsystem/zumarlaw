import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const NewPayroll = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    payrollMonth: '',
    branch: '',
    employee: '',
    paidBy: '',
    salary: '',
    paymentDate: '',
    paymentMethod: 'Cash'
  });

  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payers, setPayers] = useState([]);
  const [months, setMonths] = useState([]);
  const paymentMethods = ['Cash', 'Bank Transfer', 'Cheque'];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch dropdown data from backend
    const fetchDropdowns = async () => {
      try {
        setLoading(true);
        const [branchesRes, employeesRes, payersRes, monthsRes] = await Promise.all([
          axios.get('https://app.zumarlawfirm.com/branches'),
          axios.get('https://app.zumarlawfirm.com/employees'),
          axios.get('https://app.zumarlawfirm.com/payers'),
          axios.get('https://app.zumarlawfirm.com/payroll-months'),
        ]);
        setBranches(branchesRes.data);
        setEmployees(employeesRes.data);
        setPayers(payersRes.data);
        setMonths(monthsRes.data);
      } catch (err) {
        alert('Failed to load dropdown data');
      } finally {
        setLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    // If editing, fetch payroll data
    if (id) {
      (async () => {
        setLoading(true);
        try {
          const res = await axios.get(`https://app.zumarlawfirm.com/payrolls/${id}`);
          setFormData({
            payrollMonth: res.data.payrollMonth?.slice(0, 10) || '',
            branch: res.data.branch || '',
            employee: res.data.employee || '',
            paidBy: res.data.paidBy || '',
            salary: res.data.salary || '',
            paymentDate: res.data.paymentDate?.slice(0, 10) || '',
            paymentMethod: res.data.paymentMethod || 'Cash',
          });
        } catch (err) {
          alert('Failed to load payroll for edit');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (id) {
        await axios.put(`https://app.zumarlawfirm.com/payrolls/${id}`, formData);
        alert('Payroll updated successfully!');
      } else {
        await axios.post('https://app.zumarlawfirm.com/payrolls', formData);
        alert('Payroll saved successfully!');
      }
      setFormData({
        payrollMonth: '',
        branch: '',
        employee: '',
        paidBy: '',
        salary: '',
        paymentDate: '',
        paymentMethod: 'Cash'
      });
      navigate('/admin/payroll');
    } catch (err) {
      alert('Failed to save payroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto ">
      <h2 className="text-2xl font-bold text-[#57123f] mb-6">New Payroll</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payroll Information */}
        <div className=" border-1 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-[#57123f] mb-4">Payroll Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">Payroll Month</label>
              <input
                type="date"
                name="payrollMonth"
                value={formData.payrollMonth}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Branch</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={loading}
                placeholder="Enter Branch"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Employee</label>
              <input
                type="text"
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={loading}
                placeholder="Enter Employee"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Paid By</label>
              <input
                type="text"
                name="paidBy"
                value={formData.paidBy}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={loading}
                placeholder="Enter Payer"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 font-medium">Salary</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Enter Salary Amount"
                disabled={loading}
              />
            </div>
          </div>
        </div>
        {/* Payment Details */}
        <div className="border-1 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-[#57123f] mb-4">Payment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">Payment Date</label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Payment Method</label>
              <input
                type="text"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                disabled={loading}
                placeholder="Enter Payment Method"
              />
            </div>
          </div>
        </div>
        <div className="text-right">
          <button type="submit" className="bg-[#57123f] text-white px-6 py-2 rounded" disabled={loading}>
            {loading ? 'Saving...' : 'Save Payroll'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPayroll;
