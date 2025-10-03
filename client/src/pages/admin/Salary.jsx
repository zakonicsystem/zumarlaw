import React, { useState } from 'react';
import axios from 'axios';

const Salary = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFetchSalary = async () => {
    setLoading(true);
    try {
      if (!selectedMonth) return;
      const [year, month] = selectedMonth.split('-');
      const res = await axios.post('https://app.zumarlawfirm.com/autoSalary/calculate', { month, year });
      setSalaryData(res.data);
    } catch (err) {
      alert('Error fetching salary data');
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Salary Structure</h2>
      <div className="mb-6 flex gap-4 items-center">
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border px-3 py-2 rounded w-56"
        />
        <button
          onClick={handleFetchSalary}
          disabled={loading || !selectedMonth}
          className="bg-[#57123f] text-white px-6 py-2 rounded font-semibold hover:bg-[#7a1a59]"
        >
          {loading ? 'Calculating...' : 'Calculate Salary'}
        </button>
      </div>
      {salaryData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Employee</th>
                <th className="p-2">Email</th>
                <th className="p-2">Branch</th>
                <th className="p-2">Base Salary</th>
                <th className="p-2">Present</th>
                <th className="p-2">Absent</th>
                <th className="p-2">Leave</th>
                <th className="p-2">Holiday</th>
                <th className="p-2">Sundays</th>
                <th className="p-2">Cut Days</th>
                <th className="p-2">Final Salary</th>
              </tr>
            </thead>
            <tbody>
              {salaryData.map((row, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{row.employee}</td>
                  <td className="p-2">{row.email}</td>
                  <td className="p-2">{row.branch || '-'}</td>
                  <td className="p-2">Rs {row.baseSalary}</td>
                  <td className="p-2">{row.present}</td>
                  <td className="p-2">{row.absent}</td>
                  <td className="p-2">{row.leave}</td>
                  <td className="p-2">{row.holiday}</td>
                  <td className="p-2">{row.sundays}</td>
                  <td className="p-2">{row.cutDays}</td>
                  <td className="p-2 font-bold">Rs {row.finalSalary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-8 text-lg">No salary data found for the selected month and year.</div>
      )}
    </div>
  );
};

export default Salary;
