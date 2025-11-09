import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Expense = () => {
  const [editIdx, setEditIdx] = useState(null);
  const [editType, setEditType] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const handleEdit = (idx, exp) => {
    setEditIdx(idx);
    setEditType(exp.type);
    setEditAmount(exp.amount);
  };

  const handleUpdate = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.put(`http://localhost:5000/expense/${id}`, { type: editType, amount: parseFloat(editAmount) }, cfg);
  const expenseRes = await axios.get('http://localhost:5000/expense', cfg);
  const expenseData = Array.isArray(expenseRes.data) ? expenseRes.data : (expenseRes.data?.data || []);
  setExpenses(expenseData);
      setEditIdx(null);
      setEditType('');
      setEditAmount('');
      setMessage('Expense updated successfully!');
    } catch (err) {
      setMessage('Failed to update expense');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(`http://localhost:5000/expense/${id}`, cfg);
  const expenseRes = await axios.get('http://localhost:5000/expense', cfg);
  const expenseData = Array.isArray(expenseRes.data) ? expenseRes.data : (expenseRes.data?.data || []);
  setExpenses(expenseData);
      setMessage('Expense deleted successfully!');
    } catch (err) {
      setMessage('Failed to delete expense');
    }
  };
  const [expenses, setExpenses] = useState([]);
  const [role, setRole] = useState(null);
  const [profit, setProfit] = useState(0);
  const [form, setForm] = useState({
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    senderDesignation: '',
    senderBranch: '',
    expenseTypeNumber: 1,
    expenseCategory: 'Rent',
    expenseSubCategory: '',
    otherDetails: '',
    amount: '',
    expenseDate: '',
    branch: '',
    senderBankName: '',
    senderAccountNumber: '',
    senderAccountTitle: '',
    paymentMethod: 'Cash',
    remarks: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch profit and expenses from backend
    const fetchData = async () => {
      try {
        // prepare config (may include token)
        const token = localStorage.getItem('token');
        const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};

        // whoami to get role (only if token exists) to avoid unnecessary 401s
        if (token && token !== 'null') {
          try {
            const who = await axios.get('http://localhost:5000/auth/whoami', cfg);
            setRole(who.data.user?.role || null);
          } catch (e) {
            // if whoami fails even with token, clear role
            setRole(null);
          }
        } else {
          // no token: ensure role is null and skip calling whoami
          setRole(null);
        }

        const profitRes = await axios.get('http://localhost:5000/accounts/summary');
        setProfit(profitRes.data.totalProfit || 0);

        const expenseRes = await axios.get('http://localhost:5000/expense', cfg);
        const expenseData = Array.isArray(expenseRes.data) ? expenseRes.data : (expenseRes.data?.data || []);
        setExpenses(expenseData);
      } catch (err) {
        setMessage('Failed to fetch data');
      }
    };
    fetchData();

    // Listen for payments made elsewhere (Submissions page) and refresh
    const onPaid = () => {
      fetchData();
    };
    window.addEventListener('expense:paid', onPaid);
    return () => window.removeEventListener('expense:paid', onPaid);
  }, []);

  // Calculate totals: split paid vs unpaid so unpaid expenses don't reduce accounts
  const totalExpensesPaid = expenses.reduce((sum, exp) => sum + ((exp && exp.paid) ? (parseFloat(exp.amount) || 0) : 0), 0);
  const totalExpensesUnpaid = expenses.reduce((sum, exp) => sum + ((exp && !exp.paid) ? (parseFloat(exp.amount) || 0) : 0), 0);
  // `profit` is loaded from /accounts/summary and already deducts paid expenses on the server.
  // Use it directly as the profit-after-expenses value.
  const netProfit = profit;

  // Form handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // New expense submission payload
      // Map of main categories and their subcategories
      const mainCategories = {
        1: { name: 'Rent' },
        2: { name: 'Utility Bills', subs: ['Electricity', 'Internet', 'Gas'] },
        3: { name: 'Traveling' },
        4: { name: 'Stationery' },
        5: { name: 'Foods' },
        6: { name: 'Furniture' },
        7: { name: 'Electronic Items' },
        8: { name: 'Marketing', subs: ['Digital Marketing', 'IT Team', 'Social Media Team', 'Poster', 'Visiting Card', 'Banners'] },
        9: { name: 'Mobile Bills' },
        10: { name: 'Office Maintenance', subs: ['Paling', 'Varing', 'Color', 'Other'] },
        11: { name: 'Crockery' },
        12: { name: 'Others' },
      };

      const main = mainCategories[Number(form.expenseTypeNumber)] || { name: form.expenseCategory };
      const payload = {
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        senderDesignation: form.senderDesignation,
        senderPhone: form.senderPhone,
        senderBranch: form.senderBranch || undefined,
        paymentMethod: form.paymentMethod || 'Cash',
        senderAccountTitle: form.senderAccountTitle || undefined,
        senderBankName: form.senderBankName,
        senderAccountNumber: form.senderAccountNumber,
        expenseTypeNumber: Number(form.expenseTypeNumber),
        expenseCategory: main.name,
        expenseSubCategory: form.expenseSubCategory || undefined,
        otherDetails: form.expenseSubCategory === 'Other' ? form.otherDetails : (form.expenseTypeNumber && !main.subs ? form.otherDetails : undefined),
        remarks: form.remarks || undefined,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate || undefined,
        branch: form.branch || undefined,
      };
      const token = localStorage.getItem('token');
      const cfg = token && token !== 'null' ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.post('http://localhost:5000/expense', payload, cfg);
  const expenseRes = await axios.get('http://localhost:5000/expense', cfg);
  const expenseData = Array.isArray(expenseRes.data) ? expenseRes.data : (expenseRes.data?.data || []);
  setExpenses(expenseData);
      setForm({
        senderName: '',
        senderEmail: '',
        senderPhone: '',
        senderDesignation: '',
        senderBranch: '',
        expenseTypeNumber: 1,
        expenseCategory: 'Rent',
        expenseSubCategory: '',
        otherDetails: '',
        amount: '',
        expenseDate: '',
        branch: '',
        senderBankName: '',
        senderAccountNumber: '',
        senderAccountTitle: '',
        paymentMethod: 'Cash',
        remarks: '',
      });
      setMessage('Expense(s) added successfully!');
    } catch (err) {
      setMessage('Failed to add expense');
    }
  };

  return (
    <div>
      {role && !(['Admin', 'CEO', 'Director', 'Branch Manager'].includes(role)) && (
        <div className="p-6 text-red-600">You are not authorized to access the Expense page.</div>
      )}
      {!role || (['Admin', 'CEO', 'Director', 'Branch Manager'].includes(role)) ? (
        <div className="max-w-5xl rounded-2xl">
          <h2 className="text-3xl font-bold mb-8 text-[#57123f] text-center">Expense Management</h2>
          <div className="flex gap-8 mb-8">
            <div className="bg-green-100 text-green-800 rounded-xl p-4 shadow font-bold text-lg">
              Profit After Expenses: Rs {netProfit}
            </div>
            <div className="bg-red-100 text-red-800 rounded-xl p-4 shadow font-bold text-lg">
              Total Expenses (Paid): Rs {totalExpensesPaid}
            </div>
            <div className="ml-auto">
              {role && (['Admin', 'CEO'].includes(role)) && (
                <Link to="/admin/expense-submissions" className="bg-[#57123f] text-white px-4 py-2 rounded">View Submissions</Link>
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl shadow-2xl ">
            {/* Person Details */}
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold text-[#57123f] mb-3">Person Details</h3>
            </div>
            <div>
              <label className="block font-medium mb-1">Name</label>
              <input type="text" name="senderName" value={form.senderName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Email</label>
              <input type="email" name="senderEmail" value={form.senderEmail} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Designation</label>
              <input type="text" name="senderDesignation" value={form.senderDesignation} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Phone</label>
              <input type="text" name="senderPhone" value={form.senderPhone} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Branch</label>
              <select name="senderBranch" value={form.senderBranch} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Select Branch</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
              </select>
            </div>

            {/* Expense Details */}
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold text-[#57123f] mb-3">Expense Details</h3>
            </div>
            <div>
              <label className="block font-medium mb-1">Expense Main Category (Number)</label>
              <select name="expenseTypeNumber" value={form.expenseTypeNumber} onChange={(e) => {
                const v = e.target.value;
                const map = { 1: 'Rent', 2: 'Utility Bills', 3: 'Traveling', 4: 'Stationery', 5: 'Foods', 6: 'Furniture', 7: 'Electronic Items', 8: 'Marketing', 9: 'Mobile Bills', 10: 'Office Maintenance', 11: 'Crockery', 12: 'Others' };
                setForm({ ...form, expenseTypeNumber: Number(v), expenseCategory: map[Number(v)], expenseSubCategory: '' });
              }} className="w-full border rounded px-3 py-2">
                <option value={1}>Rent</option>
                <option value={2}>Utility Bills</option>
                <option value={3}>Traveling</option>
                <option value={4}>Stationery</option>
                <option value={5}>Foods</option>
                <option value={6}>Furniture</option>
                <option value={7}>Electronic Items</option>
                <option value={8}>Marketing</option>
                <option value={9}>Mobile Bills</option>
                <option value={10}>Office Maintenance</option>
                <option value={11}>Crockery</option>
                <option value={12}>Others</option>
              </select>
            </div>
            {/* show subcategory select or remarks depending on main category */}
            {(() => {
              const n = Number(form.expenseTypeNumber);
              // Utility Bills
              if (n === 2) {
                return (
                  <div>
                    <label className="block font-medium mb-1">Subcategory</label>
                    <select name="expenseSubCategory" value={form.expenseSubCategory} onChange={handleChange} className="w-full border rounded px-3 py-2">
                      <option value="">Select</option>
                      <option>Electricity</option>
                      <option>Internet</option>
                      <option>Gas</option>
                    </select>
                  </div>
                );
              }
              // Marketing
              if (n === 8) {
                return (
                  <div>
                    <label className="block font-medium mb-1">Marketing Subcategory</label>
                    <select name="expenseSubCategory" value={form.expenseSubCategory} onChange={handleChange} className="w-full border rounded px-3 py-2">
                      <option value="">Select</option>
                      <option>Digital Marketing</option>
                      <option>IT Team</option>
                      <option>Social Media Team</option>
                      <option>Poster</option>
                      <option>Visiting Card</option>
                      <option>Banners</option>
                    </select>
                  </div>
                );
              }
              // Office Maintenance
              if (n === 10) {
                return (
                  <div>
                    <label className="block font-medium mb-1">Maintenance Subcategory</label>
                    <select name="expenseSubCategory" value={form.expenseSubCategory} onChange={handleChange} className="w-full border rounded px-3 py-2">
                      <option value="">Select</option>
                      <option>Paling</option>
                      <option>Vairing</option>
                      <option>Color</option>
                      <option>Other</option>
                    </select>
                    {form.expenseSubCategory === 'Other' && (
                      <div className="mt-3">
                        <label className="block font-medium mb-1">Remarks / Details (Other)</label>
                        <textarea name="otherDetails" value={form.otherDetails} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} />
                      </div>
                    )}
                  </div>
                );
              }

              // Categories that should show a remarks textarea: 3,4,6,7,9,11
              const remarkCategories = [3, 4, 6, 7, 9, 11, 12];
              if (remarkCategories.includes(n)) {
                return (
                  <div className="md:col-span-2">
                    <label className="block font-medium mb-1">Remarks / Details</label>
                    <textarea name="remarks" value={form.remarks} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={4} />
                  </div>
                );
              }

              // For categories like Rent (1) and Foods (5) show no extra input by default
              return null;
            })()}

            <div>
              <label className="block font-medium mb-1">Date</label>
              <input type="date" name="expenseDate" value={form.expenseDate} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Amount</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} className="w-full border rounded px-3 py-2" min="0" />
            </div>
           

            {/* Account Details */}
            <div className="md:col-span-2">
              <h1 className="text-2xl font-semibold text-[#57123f] mb-3">Account Details</h1>
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium mb-1">Payment Method</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>

            {form.paymentMethod === 'Bank' && (
              <>
                <div>
                  <label className="block font-medium mb-1">Bank Name</label>
                  <input type="text" name="senderBankName" value={form.senderBankName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Account Title</label>
                  <input type="text" name="senderAccountTitle" value={form.senderAccountTitle} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Sender Account Number</label>
                  <input type="text" name="senderAccountNumber" value={form.senderAccountNumber} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </>
            )}

            <div className="flex items-end justify-end mt-2 md:mt-0 md:col-span-2">
              <button type="submit" className="bg-[#57123f] text-white px-6 py-2 rounded font-semibold shadow hover:bg-[#6d2c5b]">Add Expense</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default Expense;
