
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [marking, setMarking] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    let mounted = true;
    axios.get('https://app.zumarlawfirm.com/admin/roles')
      .then(res => {
        if (!mounted) return;
        setEmployees(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // fetch month filtered history
    fetchAttendanceHistory({ year, month });
    return () => { mounted = false; };
  }, [month, year]);

  const fetchAttendanceHistory = async (opts = {}) => {
    try {
      const params = {};
      if (opts.year && opts.month) {
        params.year = opts.year;
        params.month = opts.month;
      }
      if (opts.employeeId) params.employeeId = opts.employeeId;
      const res = await axios.get('https://app.zumarlawfirm.com/attendance/history', { params });
      // If employeeId provided, we just set/merge for that employee
      if (opts.employeeId) {
        // merge into attendanceHistory: remove existing for that employee then add
        const others = attendanceHistory.filter(r => r.employeeEmail !== res.data[0]?.employeeEmail);
        setAttendanceHistory([...others, ...res.data]);
      } else {
        setAttendanceHistory(res.data);
      }
    } catch (err) {
      // ignore
    }
  };

  // Generate all dates for selected month/year (handles leap years)
  const getMonthDates = (year, month) => {
    const dates = [];
    // month is 1-based
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      // format as YYYY-MM-DD without using toISOString to avoid timezone shifts
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      dates.push(`${year}-${mm}-${dd}`);
    }
    return dates;
  };
  // Exclude Sundays from the dates shown (use local Date constructed from parts)
  const filteredDates = getMonthDates(year, month).filter(d => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).getDay() !== 0;
  });

  // Helper to get status for employee on a date
  const getStatus = (emp, date) => {
    const record = attendanceHistory.find(r => r.employeeName === emp.name && r.date === date);
    if (!record) return '';
    if (record.holiday) return 'holiday';
    if (record.leaveRelief) return 'leaveRelief';
    if (record.leave) return 'leave';
    if (record.halfDay) return 'halfDay';
    if (record.present) return 'present';
    if (record.absent) return 'absent';
    return '';
  };

  // Edit previous attendance
  const handleEditAttendance = async (id, date, status) => {
    setMarking(true);
    try {
      await axios.patch('https://app.zumarlawfirm.com/attendance/edit', {
        employeeId: id,
        date,
        present: status === 'present',
        leave: status === 'leave',
        holiday: status === 'holiday',
        halfDay: status === 'halfDay',
        leaveRelief: status === 'leaveRelief',
        absent: status === 'absent'
      });
      fetchAttendanceHistory();
    } catch (err) {}
    setMarking(false);
  };

  // Month/year dropdowns
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = Array.from(new Set(attendanceHistory.map(r => new Date(r.date).getFullYear())));
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);

  // Employees are shown as tabs in a grid (3 columns). No horizontal overflow.

  return (
  <div className="p-4" style={{ overflowX: 'hidden' }}>
      <h2 className="text-xl font-bold mb-4">Attendance</h2>
      <div className="flex gap-4 mb-4">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-2 py-1 rounded bg-gray-100">
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-2 py-1 rounded bg-gray-100">
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div>
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2">
                {employees.map((emp, idx) => (
                  <button
                    key={emp._id}
                    onClick={() => setActiveTab(idx)}
                    className={`w-full box-border px-3 py-2 text-left rounded ${activeTab === idx ? 'bg-[#57123f] text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    <div className="font-semibold truncate">{emp.name}</div>
                    <div className="text-xs text-gray-500 truncate">{emp.email}</div>
                  </button>
                ))}
              </div>
            </div>
            {employees[activeTab] && (
              <div className="border rounded p-3 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-semibold text-sm">{employees[activeTab].name}</div>
                    <div className="text-xs text-gray-500">{employees[activeTab].email}</div>
                  </div>
                  <div className="text-sm text-gray-600">{new Date(year, month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="overflow-auto max-h-[420px]">
                  <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th className="text-left pb-2">Day</th>
                        <th className="text-left pb-2">Date</th>
                        <th className="text-center pb-2" style={{ width: '80px' }}>Status</th>
                        <th className="text-center pb-2" >Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDates.map((date, idx) => {
                        const emp = employees[activeTab];
                        const status = getStatus(emp, date);
                        const [y, m, d] = date.split('-').map(Number);
                        const dayName = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
                        const dayNumber = d;
                        let cellClass = '';
                        if (status === 'present') cellClass = 'bg-green-50';
                        else if (status === 'leave') cellClass = 'bg-yellow-50';
                        else if (status === 'absent') cellClass = 'bg-red-50';
                        else if (status === 'holiday') cellClass = 'bg-blue-50';
                        else if (status === 'halfDay') cellClass = 'bg-orange-50';
                        else if (status === 'leaveRelief') cellClass = 'bg-purple-50';
                        return (
                          <tr key={date} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-2 py-1 align-top">{dayName}</td>
                            <td className="px-2 py-1 align-top font-semibold" title={date}>{dayNumber}</td>
                            <td className={`px-2 py-1 text-center align-top ${cellClass}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {status === 'present' && <span className="text-green-600">P</span>}
                              {status === 'leave' && <span className="text-yellow-600">L</span>}
                              {status === 'absent' && <span className="text-red-600">A</span>}
                              {status === 'holiday' && <span className="text-blue-600">H</span>}
                              {status === 'halfDay' && <span className="text-orange-600">HD</span>}
                              {status === 'leaveRelief' && <span className="text-purple-600">LR</span>}
                            </td>
                            <td className="px-2 py-1 text-center align-top">
                              <div className="flex gap-1 justify-center flex-wrap">
                                <button title="Present" className="px-2 py-1 bg-green-200 hover:bg-green-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'present')}>P</button>
                                <button title="Leave" className="px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'leave')}>L</button>
                                <button title="Absent" className="px-2 py-1 bg-red-200 hover:bg-red-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'absent')}>A</button>
                                <button title="Holiday" className="px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'holiday')}>H</button>
                                <button title="Half Day" className="px-2 py-1 bg-orange-200 hover:bg-orange-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'halfDay')}>HD</button>
                                <button title="Leave Relief" className="px-2 py-1 bg-purple-200 hover:bg-purple-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'leaveRelief')}>LR</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Attendance;