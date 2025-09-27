import React, { useEffect, useState } from 'react';
import { FaUsers, FaBoxOpen, FaChartLine, FaClock } from 'react-icons/fa';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import axios from 'axios';

const statIcons = {
  "New Leads": <FaUsers className="text-[#57123f]" />,
  "Services Booked": <FaBoxOpen className="text-[#57123f]" />,
  "Total Sales": <FaChartLine className="text-[#57123f]" />,
  "Pending Cases": <FaClock className="text-[#57123f]" />,
};

const FILTERS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const StatsCards = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState([
    { title: "New Leads", value: "-", change: "-", color: "text-gray-400", direction: "up" },
    { title: "Services Booked", value: "-", change: "-", color: "text-gray-400", direction: "up" },
    { title: "Total Sales", value: "-", change: "-", color: "text-gray-400", direction: "up" },
    { title: "Pending Cases", value: "-", change: "-", color: "text-gray-400", direction: "down" },
  ]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('day');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        let url = `https://app.zumarlawfirm.com/admin/stats?filter=${filter}`;
        if (filter === 'day') {
          url += `&date=${selectedDate}`;
        } else if (filter === 'month') {
          url += `&month=${selectedMonth + 1}&year=${selectedYear}`;
        } else if (filter === 'year') {
          url += `&year=${selectedYear}`;
        }
        console.log(`Fetching stats for:`, url);
        const res = await axios.get(url);
        setStats(res.data);
        console.log('Stats response:', res.data);
      } catch (err) {
        setStats(prev => prev.map(s => ({ ...s, value: 'Error', color: 'text-red-500' })));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [filter, selectedMonth, selectedYear, selectedDate]);

  return (
    <>
      <div className='flex justify-between items-center'>
        <div>
          <p className="text-gray-500">Leads</p>
        </div>
        {/* Dynamic filter controls */}
        {filter === 'day' && (
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f] focus:border-transparent"
          />
        )}
        {filter === 'month' && (
          <>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f] focus:border-transparent mr-2"
            >
              {months.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f] focus:border-transparent"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </>
        )}
        {filter === 'year' && (
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f] focus:border-transparent"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`px-3 py-1 rounded-full border-2 transition-colors duration-200 shadow-sm font-semibold text-sm
              ${filter === f.value ? 'bg-gradient-to-r from-[#57123f] to-[#a8326e] text-white border-[#a8326e] scale-105' : 'bg-white text-[#57123f] border-gray-300 hover:bg-[#f3e6ef] hover:border-[#57123f]'}`}
            style={{ minWidth: 80 }}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-6">
        {(Array.isArray(stats) ? stats : Object.values(stats)).map((stat, idx) => {
          // Special handling for Completed Service Prices array
          if (stat.title === 'Completed Service Prices' && Array.isArray(stat.value)) {
            return (
              <div key={idx} className="bg-white hidden rounded-xl shadow-md px-6 py-4 flex-col items-start h-32 overflow-auto">
                <p className="text-gray-500 text-sm font-medium truncate">{stat.title}</p>
                <div className="mt-2 w-full">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left">Type</th>
                        <th className="text-left">Title</th>
                        <th className="text-left">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stat.value.map((item) => (
                        <tr key={item.id}>
                          <td>{item.type}</td>
                          <td>{item.title}</td>
                          <td>{item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }
          // Default card rendering
          return (
            <div key={idx} className="bg-white rounded-xl shadow-md px-6 py-4 flex justify-between items-start h-32">
              <div>
                <p className="text-gray-500 text-sm font-medium truncate">{stat.title || ''}</p>
                <h2 className="text-2xl font-bold mt-1 truncate">{stat.value}</h2>
              </div>
            </div>
          );
        })}
      </div>
      {loading && <div className="text-center text-gray-400">Loading stats...</div>}
    </>
  );
};

export default StatsCards;