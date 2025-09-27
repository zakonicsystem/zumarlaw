import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [marking, setMarking] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch attendance history (all or single employee)
  useEffect(() => {
    axios.get('https://app.zumarlawfirm.com/admin/roles')
      .then(res => {
        setEmployees(res.data);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
      });
    fetchAttendanceHistory();
  }, []);

  const fetchAttendanceHistory = (employeeId = null) => {
    const url = employeeId
      ? `https://app.zumarlawfirm.com/attendance/history/${employeeId}`
      : 'https://app.zumarlawfirm.com/attendance/history';
    axios.get(url)
      .then(res => setAttendanceHistory(res.data))
      .catch(() => {});
  };

  // Helper: get today's attendance for each employee
  const today = new Date().toISOString().slice(0, 10);
  const getPresentStatus = (emp) => {
    const record = attendanceHistory.find(r => r.employeeName === emp.name && r.date === today);
    return record ? record.present : false;
  };

  const handleAttendance = async (id, status) => {
    setMarking(true);
    try {
      await axios.post('https://app.zumarlawfirm.com/attendance/mark', {
        employeeId: id,
        present: status
      });
      setEmployees(prev =>
        prev.map(emp =>
          emp._id === id ? { ...emp, present: status } : emp
        )
      );
      // Optionally, refetch history after marking
      const res = await axios.get('https://app.zumarlawfirm.com/attendance/history');
      setAttendanceHistory(res.data);
    } catch (err) {}
    setMarking(false);
  };

  // Mark all employees as present
  const handleMarkAllPresent = async () => {
    setMarking(true);
    try {
      await Promise.all(
        employees.map(emp => {
          const isPresent = getPresentStatus(emp);
          if (!isPresent) {
            return axios.post('https://app.zumarlawfirm.com/attendance/mark', {
              employeeId: emp._id,
              present: true
            });
          }
          return null;
        })
      );
      // Refetch history after marking
      const res = await axios.get('https://app.zumarlawfirm.com/attendance/history');
      setAttendanceHistory(res.data);
    } catch (err) {}
    setMarking(false);
  };

  // Group attendance history by day, date, and month (only for all employees view)
  const groupedHistory = {};
  if (!selectedEmployee) {
    attendanceHistory.forEach(record => {
      const dateObj = new Date(record.date);
      const day = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const date = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
      const key = `${day}-${date}-${month}`;
      if (!groupedHistory[key]) groupedHistory[key] = [];
      groupedHistory[key].push(record);
    });
  }

  // Filter history for selected employee
  const filteredHistory = selectedEmployee
    ? attendanceHistory.filter(r => r.employeeName === selectedEmployee.name)
    : attendanceHistory;

  // When a card is clicked, fetch single employee attendance
  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    fetchAttendanceHistory(emp._id);
  };

  // When 'Show All' is clicked, fetch all attendance
  const handleShowAll = () => {
    setSelectedEmployee(null);
    fetchAttendanceHistory();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Attendance</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {!selectedEmployee && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {employees.map(emp => {
                const isPresent = getPresentStatus(emp);
                const todayRecord = attendanceHistory.find(r => r.employeeName === emp.name && r.date === today);
                return (
                  <div key={emp._id} className={`rounded-xl shadow p-4 flex flex-col items-center border ${isPresent ? 'border-green-400' : 'border-gray-300'} cursor-pointer transition hover:scale-105`} onClick={() => handleSelectEmployee(emp)}>
                    <div className="font-bold text-lg mb-2">{emp.name}</div>
                    <div className="text-gray-500 mb-2">{emp.email}</div>
                    <div className="mb-2 text-sm">Date: {todayRecord ? todayRecord.date : today}</div>
                    <div className="mb-2 text-sm">Time: {todayRecord && todayRecord.time ? todayRecord.time : '-'}</div>
                    <div className="mb-2 text-sm">Status: {isPresent ? <span className="text-green-600">Present</span> : <span className="text-red-600">Absent</span>}</div>
                    <div className="flex gap-2 mt-2">
                      <button
                        className={`px-4 py-2 rounded font-semibold ${isPresent ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        disabled={marking}
                        onClick={e => { e.stopPropagation(); handleAttendance(emp._id, true); }}
                      >
                        Present
                      </button>
                      <button
                        className={`px-4 py-2 rounded font-semibold ${!isPresent ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        disabled={marking}
                        onClick={e => { e.stopPropagation(); handleAttendance(emp._id, false); }}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="overflow-x-auto">
            {!selectedEmployee ? (
              Object.entries(groupedHistory).map(([groupKey, records], idx) => {
                const [day, date, month] = groupKey.split('-');
                return (
                  <div key={groupKey} className="mb-8">
                    <div className="font-bold text-lg mb-2">{day}, {date} {month}</div>
                    <table className="w-full border text-left mb-2">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Time</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2">{record.employeeName}</td>
                            <td className="px-4 py-2">{record.employeeEmail || '-'}</td>
                            <td className="px-4 py-2">{record.date}</td>
                            <td className="px-4 py-2">{record.time ? record.time : '-'}</td>
                            <td className="px-4 py-2">{record.present ? (
                              <span className="text-green-600">Present</span>
                            ) : (
                              <span className="text-red-600">Absent</span>
                            )}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })
            ) : (
              <table className="w-full border text-left mb-2">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2">{record.date}</td>
                      <td className="px-4 py-2">{record.time ? record.time : '-'}</td>
                      <td className="px-4 py-2">{record.present ? (
                        <span className="text-green-600">Present</span>
                      ) : (
                        <span className="text-red-600">Absent</span>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {selectedEmployee && (
            <button className="ml-4 px-2 py-1 bg-gray-200 rounded text-xs" onClick={handleShowAll}>Show All</button>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;