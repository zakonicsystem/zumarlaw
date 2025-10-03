
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
    axios.get('http://localhost:5000/admin/roles')
      .then(res => {
        setEmployees(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetchAttendanceHistory();
  }, []);

  const fetchAttendanceHistory = () => {
    axios.get('http://localhost:5000/attendance/history')
      .then(res => setAttendanceHistory(res.data))
      .catch(() => {});
  };

  // Generate all dates for selected month/year (handles leap years)
  const getMonthDates = (year, month) => {
    const dates = [];
    // month is 1-based
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
  };
  const filteredDates = getMonthDates(year, month);

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
      await axios.patch('http://localhost:5000/attendance/edit', {
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

  return (
    <div className="p-4">
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
          <div className="mb-4 flex gap-2 border-b">
            {employees.map((emp, idx) => (
              <button
                key={emp._id}
                className={`px-4 py-2 rounded-t ${activeTab === idx ? 'bg-[#57123f] text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab(idx)}
              >
                {emp.name}
              </button>
            ))}
          </div>
          {employees[activeTab] && (
            <div className="overflow-x-auto">
              <table className="min-w-max w-full border text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-2 border">Date</th>
                    <th className="px-2 py-2 border">Status</th>
                    <th className="px-2 py-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDates.map((date, idx) => {
                    const emp = employees[activeTab];
                    const status = getStatus(emp, date);
                    let cellClass = '';
                    if (status === 'present') cellClass = 'bg-green-50';
                    else if (status === 'leave') cellClass = 'bg-yellow-50';
                    else if (status === 'absent') cellClass = 'bg-red-50';
                    else if (status === 'holiday') cellClass = 'bg-blue-50';
                    else if (status === 'halfDay') cellClass = 'bg-orange-50';
                    else if (status === 'leaveRelief') cellClass = 'bg-purple-50';
                    return (
                      <tr key={date} className={idx % 2 === 0 ? 'bg-gray-50 border-b' : 'bg-white border-b'}>
                        <td className="px-2 py-2 border font-semibold">{date}</td>
                        <td className={`px-2 py-2 border font-bold text-center ${cellClass}`}>
                          {status === 'present' && <span className="text-green-600">Present</span>}
                          {status === 'leave' && <span className="text-yellow-600">Leave</span>}
                          {status === 'absent' && <span className="text-red-600">Absent</span>}
                          {status === 'holiday' && <span className="text-blue-600">Holiday</span>}
                          {status === 'halfDay' && <span className="text-orange-600">Half Day</span>}
                          {status === 'leaveRelief' && <span className="text-purple-600">Leave Relief</span>}
                        </td>
                        <td className="px-2 py-2 border text-center">
                          <div className="flex gap-1 justify-center">
                            <button className="px-2 py-1 bg-green-200 hover:bg-green-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'present')}>P</button>
                            <button className="px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'leave')}>L</button>
                            <button className="px-2 py-1 bg-red-200 hover:bg-red-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'absent')}>A</button>
                            <button className="px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'holiday')}>H</button>
                            <button className="px-2 py-1 bg-orange-200 hover:bg-orange-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'halfDay')}>HD</button>
                            <button className="px-2 py-1 bg-purple-200 hover:bg-purple-300 rounded text-xs" disabled={marking} onClick={() => handleEditAttendance(emp._id, date, 'leaveRelief')}>LR</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Attendance;