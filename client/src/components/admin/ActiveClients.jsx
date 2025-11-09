import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';

const ActiveClients = () => {
  const [latestLeads, setLatestLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const lead = () => {
    navigate('/admin/leads');
  };
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        // Fetch latest 3 leads from backend
        const res = await axios.get('https://app.zumarlawfirm.com/admin/leads/latest?limit=3');
        setLatestLeads(res.data);
      } catch (err) {
        setLatestLeads([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  return (
    <div className="bg-white p-6 mt-6 rounded-[20px] shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Active Clients</h2>
        <div className="relative inline-block">
          <select className="appearance-none border border-gray-300 text-sm rounded-md px-3 py-1 text-gray-500 bg-white pr-6 focus:outline-none focus:ring-2 focus:ring-[#57123f]">
            <option>Last 7 Days</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
            <option>All Time</option>
          </select>
          <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-100 text-gray-500 text-sm rounded-lg">
              <th className="py-3 px-4 rounded-l-xl">Lead Name</th>
              <th className="py-3 px-4">Service Booked</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Assigned To</th>
              <th className="py-3 px-4 rounded-r-xl">Status</th>
            </tr>
          </thead>
          <tbody>
            {latestLeads.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No leads found.'}
                </td>
              </tr>
            ) : (
              latestLeads.map((client, idx) => (
                <tr key={idx} className="border-t text-sm text-gray-700 hover:bg-gray-50">
                  <td className="py-4 px-4 flex items-center gap-2 font-medium">
                    <FaUserCircle className="text-2xl text-gray-400" />
                    {client.name}
                  </td>
                  <td className="py-4 px-4 max-w-[160px] truncate">{client.service}</td>
                  <td className="py-4 px-4">{client.phone || 'No Phone'}</td>
                  <td className="py-4 px-4">{client.assigned || 'N/A'}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.status === 'Active' ? 'bg-green-500 text-white' :
                        client.status === 'On Hold' ? 'bg-red-500 text-white' :
                          'bg-yellow-400 text-black'
                      }`}>
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 text-center">
        <button onClick={lead} className="text-[#57123f] font-semibold text-sm flex items-center cursor-pointer justify-center gap-1 mx-auto hover:underline">
          View Lead List <span>→</span>
        </button>
      </div>
    </div>
  );
};

export default ActiveClients;
