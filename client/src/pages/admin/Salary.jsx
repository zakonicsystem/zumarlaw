import React, { useState } from 'react';
import axios from 'axios';

const Salary = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const formatCurrency = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };
  const daysInMonth = lastQuery ? new Date(lastQuery.year, lastQuery.month, 0).getDate() : null;

  const handleFetchSalary = async () => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const res = await axios.post('http://localhost:5000/autoSalary/calculate', { month, year });
      console.log('autoSalary/calculate response:', res.data);
      let data = res.data || [];
      // If backend returned empty, try to compute client-side using roles + attendance
      if ((!data || data.length === 0)) {
        try {
          const [rolesRes, attRes] = await Promise.all([
            axios.get('http://localhost:5000/admin/roles'),
            axios.get('http://localhost:5000/attendance/history', { params: { year, month } })
          ]);
          const employees = rolesRes.data || [];
          const attendance = attRes.data || [];
          // compute per employee (match backend rules)
          const compute = (emp) => {
            // attendance entries use `email` and `employeeName` fields
            const empAtt = attendance.filter(a => a.email === emp.email || a.employeeName === emp.name);
            let absent = 0, leave = 0, holiday = 0, present = 0, leaveRelief = 0, halfDay = 0;
            const daysInMonth = new Date(year, month, 0).getDate();
            const baseSalary = parseFloat(emp.salary || '0') || 0;
            // iterate every day: Sundays and holidays are treated as paid days
            let computedSundays = 0;
            // We'll treat missing record on Sunday as paid (no absent)
            for (let d = 1; d <= daysInMonth; d++) {
              const dateObj = new Date(year, month - 1, d);
              const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              if (dateObj.getDay() === 0) {
                computedSundays++;
              }
              const rec = empAtt.find(r => r.date === iso);
              if (rec) {
                if (rec.holiday) {
                  holiday++; // holiday is paid
                } else if (rec.leaveRelief) {
                  leaveRelief++;
                } else if (rec.halfDay) {
                  halfDay++; present++; // half-day treated as paid
                } else if (rec.leave) {
                  leave++;
                } else if (rec.present) {
                  present++;
                } else if (rec.absent) {
                  absent++;
                } else {
                  absent++;
                }
              } else {
                // no record
                if (dateObj.getDay() === 0) {
                  // Sunday no record -> paid
                } else {
                  // non-Sunday no record -> absent
                  absent++;
                }
              }
            }
            const sundays = computedSundays;
            // Sundays and holidays are paid; workingDays = full days in month
            const workingDays = daysInMonth;
            const perDaySalary = baseSalary / (workingDays || 1);
            const extraLeaves = Math.max(0, leave - 2);
            const cutDays = absent + extraLeaves;
            const finalSalary = Math.round(baseSalary - cutDays * perDaySalary);
            return {
              employee: emp.name,
              email: emp.email,
              branch: emp.branch || '-',
              baseSalary,
              present,
              absent,
              leave,
              holiday,
              halfDay,
              leaveRelief,
              sundays,
              cutDays,
              finalSalary
            };
          };
          data = employees.map(compute);
          setUsedFallback(true);
        } catch (err) {
          console.warn('fallback compute failed', err);
        }
      }
      setSalaryData(data || []);
      setLastQuery({ year, month });
    } catch (err) {
      console.error(err);
      alert('Error fetching salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async () => {
    if (!lastQuery) return alert('Please calculate salary first');
    setSaving(true);
    try {
      const { year, month } = lastQuery;
      const res = await axios.post('http://localhost:5000/autoSalary', { month, year });
      if (res.data && res.data.success) {
        alert(`Payroll created for ${res.data.payrolls.length} employees`);
      } else {
        alert('Payroll created');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating payroll');
    } finally {
      setSaving(false);
    }
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
        {salaryData.length > 0 && (
          <button
            onClick={handleCreatePayroll}
            disabled={saving}
            className="ml-2 bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
          >
            {saving ? 'Saving...' : 'Create Payroll'}
          </button>
        )}
      </div>
      {salaryData.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-700">Results for: {lastQuery ? `${new Date(lastQuery.year, lastQuery.month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}` : '—'}</div>
            <div className="text-sm text-gray-600">Source: {usedFallback ? 'Client fallback' : 'Server'}</div>
          </div>
          {usedFallback && (
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">Showing client-side calculated salaries because server returned no data for the selected month.</div>
          )}
          <div className="overflow-auto border rounded shadow" style={{ maxHeight: '60vh' }}>
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 900 }}>
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-center">Employee</th>
                  <th className="p-2 text-center">Email</th>
                  <th className="p-2 text-center">Branch</th>
                  <th className="p-2 text-center">Total Days</th>
                  <th className="p-2 text-center">Base Salary</th>
                  <th className="p-2 text-center">Present</th>
                  <th className="p-2 text-center">Absent</th>
                  <th className="p-2 text-center">Leave</th>
                  <th className="p-2 text-center">Holiday</th>
                  <th className="p-2 text-center">Half Day</th>
                  <th className="p-2 text-center">Leave Relief</th>
                  <th className="p-2 text-center">Sundays</th>
                  <th className="p-2 text-center">Cut Days</th>
                  <th className="p-2 text-center">Final Salary</th>
                </tr>
              </thead>
              <tbody>
                {salaryData.map((row, idx) => (
                  <tr key={idx} className="border-b odd:bg-white even:bg-gray-50">
                    <td className="p-2">{row.employee}</td>
                    <td className="p-2 truncate">{row.email}</td>
                    <td className="p-2">{row.branch || '-'}</td>
                    <td className="p-2 text-center">{daysInMonth ?? '-'}</td>
                    <td className="p-2 text-center">Rs {formatCurrency(row.baseSalary)}</td>
                    <td className="p-2 text-center">{row.present}</td>
                    <td className="p-2 text-center">{row.absent}</td>
                    <td className="p-2 text-center">{row.leave}</td>
                    <td className="p-2 text-center">{row.holiday}</td>
                    <td className="p-2 text-center">{row.halfDay ?? 0}</td>
                    <td className="p-2 text-center">{row.leaveRelief}</td>
                    <td className="p-2 text-center">{row.sundays}</td>
                    <td className="p-2 text-center">{row.cutDays}</td>
                    <td className="p-2 text-center font-bold">Rs {formatCurrency(row.finalSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-8 text-lg">No salary data found for the selected month and year.</div>
      )}
    </div>
  );
};

export default Salary;
