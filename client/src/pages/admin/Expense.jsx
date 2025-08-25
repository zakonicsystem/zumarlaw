import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import axios from 'axios';

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
      await axios.put(`https://app.zumarlawfirm.com/expense/${id}`, { type: editType, amount: parseFloat(editAmount) });
      const expenseRes = await axios.get('https://app.zumarlawfirm.com/expense');
      setExpenses(expenseRes.data || []);
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
      await axios.delete(`https://app.zumarlawfirm.com/expense/${id}`);
      const expenseRes = await axios.get('https://app.zumarlawfirm.com/expense');
      setExpenses(expenseRes.data || []);
      setMessage('Expense deleted successfully!');
    } catch (err) {
      setMessage('Failed to delete expense');
    }
  };
  const [expenses, setExpenses] = useState([]);
  const [profit, setProfit] = useState(0);
  const [form, setForm] = useState({
    officeBoyName: '',
    officeBoyBranch: '',
    amount: '',
    type: 'Salary',
    branchName: '',
    branchExpenseAmount: '',
    branchExpenseType: '',
    expenseType: 'Expense',
    beverageAmount: '',
    beverageType: '',
    beverageBranch: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch profit and expenses from backend
    const fetchData = async () => {
      try {
        const profitRes = await axios.get('https://app.zumarlawfirm.com/accounts/summary');
        setProfit(profitRes.data.totalProfit || 0);
        const expenseRes = await axios.get('https://app.zumarlawfirm.com/expense');
        setExpenses(expenseRes.data || []);
      } catch (err) {
        setMessage('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  // Calculate net profit (profit minus expenses)
  const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const netProfit = profit - totalExpenses;

  // Form handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Office Boy Salary
      if (form.type === 'Salary' && form.officeBoyName && form.amount && form.officeBoyBranch) {
        await axios.post('https://app.zumarlawfirm.com/expense', {
          type: `Office Boy Salary - ${form.officeBoyName}`,
          amount: parseFloat(form.amount),
          officeBoyName: form.officeBoyName,
          officeBoyBranch: form.officeBoyBranch,
        });
      }
      // Branch Expense
      if (form.type === 'Expense' && form.branchName && form.branchExpenseAmount && form.branchExpenseType) {
        await axios.post('https://app.zumarlawfirm.com/expense', {
          type: 'Expense', // Always set type to 'Expense' for branch expenses
          amount: parseFloat(form.branchExpenseAmount),
          branchName: form.branchName,
          expenseWorkType: form.branchExpenseType,
        });
      }
      // Beverage
      if (form.type === 'Beverage' && form.beverageAmount && form.beverageType && form.beverageBranch) {
        await axios.post('https://app.zumarlawfirm.com/expense', {
          type: `Beverage - ${form.beverageType}`,
          amount: parseFloat(form.beverageAmount),
          beverageType: form.beverageType,
          beverageBranch: form.beverageBranch,
        });
      }
      const expenseRes = await axios.get('https://app.zumarlawfirm.com/expense');
      setExpenses(expenseRes.data || []);
      setForm({
        officeBoyName: '',
        officeBoyBranch: '',
        amount: '',
        type: 'Salary',
        branchName: '',
        branchExpenseAmount: '',
        branchExpenseType: '',
        expenseType: 'Expense',
  beverageAmount: '',
  beverageType: '',
  beverageBranch: '',
      });
      setMessage('Expense(s) added successfully!');
    } catch (err) {
      setMessage('Failed to add expense');
    }
  };

  return (
    <div>
      <div className="max-w-5xl p-8 rounded-2xl">
        <h2 className="text-3xl font-bold mb-8 text-[#57123f] text-center">Expense Management</h2>
        <div className="flex gap-8 mb-8">
          <div className="bg-green-100 text-green-800 rounded-xl p-4 shadow font-bold text-lg">
            Profit After Expenses: Rs {netProfit}
          </div>
          <div className="bg-red-100 text-red-800 rounded-xl p-4 shadow font-bold text-lg">
            Total Expenses: Rs {totalExpenses}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f8e6f2] p-6 rounded-xl shadow">
          <div>
            <label className="block font-medium mb-1">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="Salary">Salary</option>
              <option value="Expense">Expense</option>
              <option value="Beverage">Beverage</option>
            </select>
          </div>
          {form.type === 'Salary' && (
            <>
              <div>
                <label className="block font-medium mb-1">Office Boy Name</label>
                <input
                  type="text"
                  name="officeBoyName"
                  value={form.officeBoyName}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter office boy's name"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Office Boy Branch</label>
                <input
                  type="text"
                  name="officeBoyBranch"
                  value={form.officeBoyBranch}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter branch name"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Amount (Salary)</label>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  min="0"
                />
              </div>
            </>
          )}
          {form.type === 'Expense' && (
            <>
              <div>
                <label className="block font-medium mb-1">Branch Name</label>
                <input
                  type="text"
                  name="branchName"
                  value={form.branchName}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter branch name"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Branch Expense (Amount)</label>
                <input
                  type="number"
                  name="branchExpenseAmount"
                  value={form.branchExpenseAmount}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  min="0"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Type of Expense (Work)</label>
                <input
                  type="text"
                  name="branchExpenseType"
                  value={form.branchExpenseType}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Electricity, Rent, Supplies"
                />
              </div>
            </>
          )}
          {form.type === 'Beverage' && (
            <>
              <div>
                <label className="block font-medium mb-1">Beverage Type</label>
                <input
                  type="text"
                  name="beverageType"
                  value={form.beverageType}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Tea, Coffee, Water"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Beverage Amount</label>
                <input
                  type="number"
                  name="beverageAmount"
                  value={form.beverageAmount}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  min="0"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Beverage Branch</label>
                <input
                  type="text"
                  name="beverageBranch"
                  value={form.beverageBranch}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter branch name"
                />
              </div>
            </>
          )}
          <div className="flex items-end justify-end mt-2 md:mt-0">
            <button type="submit" className="bg-[#57123f] text-white px-6 py-2 rounded font-semibold shadow hover:bg-[#6d2c5b]">Add Expense</button>
          </div>
        </form>
        <h3 className="text-xl font-bold mb-4 text-[#57123f]">Daily Beverage Expense</h3>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-[700px] w-full text-sm border rounded-xl shadow">
            <thead>
              <tr className="bg-[#f3e8ff] text-[#57123f]">
                <th className="p-3 text-left">Beverage Type</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.filter(exp => exp.type && exp.type.startsWith('Beverage')).map((exp, idx) => (
                <tr key={exp._id || idx} className="border-b">
                  <td className="p-3">{exp.beverageType || (exp.type ? exp.type.replace('Beverage - ', '') : '')}</td>
                  <td className="p-3">{editIdx === idx ? (
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="border rounded px-2 py-1 w-full" />
                  ) : exp.amount}</td>
                  <td className="p-3">{exp.beverageBranch || ''}</td>
                  <td className="p-3">
                    {editIdx === idx ? (
                      <>
                        <button className="bg-green-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleUpdate(exp._id)}>Save</button>
                        <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={() => setEditIdx(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="bg-blue-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleEdit(idx, exp)}><FaEdit /></button>
                        <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(exp._id)}><FaTrash /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {message && <div className="mb-4 text-green-600 font-semibold text-center">{message}</div>}
        <h3 className="text-xl font-bold mb-4 text-[#57123f]">Office Boy Salary</h3>
        <div className="overflow-x-auto mb-8">
          <table className="min-w-[700px] w-full text-sm border rounded-xl shadow">
            <thead>
              <tr className="bg-[#f3e8ff] text-[#57123f]">
                <th className="p-3 text-left">Office Boy Name</th>
                <th className="p-3 text-left">Office Boy Branch</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.filter(exp => exp.type === 'Salary' || (exp.type && exp.type.startsWith('Office Boy Salary'))).map((exp, idx) => (
                <tr key={exp._id || idx} className="border-b">
                  <td className="p-3">{exp.officeBoyName || (exp.type ? exp.type.replace('Office Boy Salary - ', '') : '')}</td>
                  <td className="p-3">{exp.officeBoyBranch || ''}</td>
                  <td className="p-3">{editIdx === idx ? (
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="border rounded px-2 py-1 w-full" />
                  ) : exp.amount}</td>
                  <td className="p-3">
                    {editIdx === idx ? (
                      <>
                        <button className="bg-green-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleUpdate(exp._id)}>Save</button>
                        <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={() => setEditIdx(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="bg-blue-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleEdit(idx, exp)}><FaEdit /></button>
                        <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(exp._id)}><FaTrash /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-bold mb-4 text-[#57123f]">Branch Expense</h3>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm border rounded-xl shadow">
            <thead>
              <tr className="bg-[#f3e8ff] text-[#57123f]">
                <th className="p-3 text-left">Branch Name</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Type of Expense (Work)</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.filter(exp => exp.type === 'Expense').map((exp, idx) => (
                <tr key={exp._id || idx} className="border-b">
                  <td className="p-3">{exp.branchName || (exp.type && exp.type.includes(' - ') ? exp.type.split(' - ')[0] : '')}</td>
                  <td className="p-3">{editIdx === idx ? (
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="border rounded px-2 py-1 w-full" />
                  ) : exp.amount}</td>
                  <td className="p-3">{exp.expenseWorkType || (exp.type && exp.type.includes(' - ') ? exp.type.split(' - ')[1] : '')}</td>
                  <td className="p-3">
                    {editIdx === idx ? (
                      <>
                        <button className="bg-green-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleUpdate(exp._id)}>Save</button>
                        <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={() => setEditIdx(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="bg-blue-600 text-white px-2 py-1 rounded mr-2" onClick={() => handleEdit(idx, exp)}><FaEdit /></button>
                        <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => handleDelete(exp._id)}><FaTrash /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Expense;
