import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const COLORS = ['#10b981', '#facc15', '#6366f1'];

const ServiceProcessing = () => {
  const [serviceStats, setServiceStats] = useState({ completed: 0, processing: 0, pending: 0, rejected: 0 });
  const [latestCompleted, setLatestCompleted] = useState([]);
  const [filterProgress, setFilterProgress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch service status counts and latest completed services from backend
    const fetchStats = async () => {
      try {
        const statsRes = await axios.get('https://app.zumarlawfirm.com/admin/service-status-counts');
        setServiceStats(statsRes.data);
        // Fetch only latest 4 completed services from all models
        const completedRes = await axios.get('https://app.zumarlawfirm.com/admin/latest-completed-services?limit=4');
        // Log the response for debugging
        console.log('Latest completed services:', completedRes.data);
        setLatestCompleted(Array.isArray(completedRes.data) ? completedRes.data : []);
      } catch (err) {
        setServiceStats({ completed: 0, processing: 0, pending: 0 });
        setLatestCompleted([]);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const pieData = [
    { name: 'Completed', value: serviceStats.completed },
    { name: 'Processing', value: serviceStats.processing },
    { name: 'Pending', value: serviceStats.pending },
    { name: 'Rejected', value: serviceStats.rejected },
  ];

  // Ensure latestCompleted is always an array
  const safeLatestCompleted = Array.isArray(latestCompleted) ? latestCompleted : [];
  const filteredLatest = filterProgress ? safeLatestCompleted.filter(s => s.progressStatus === filterProgress) : safeLatestCompleted;

  const handleDownload = (certUrl) => {
    if (certUrl) {
      const link = document.createElement('a');
      link.href = certUrl;
      link.download = certUrl.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Certification downloaded successfully.');
    } else {
      toast.error('No certification file available.');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 mt-6">
      {/* Pie Chart (Left Side, 40%) */}
      <div className="bg-white p-6 rounded-[20px] shadow-md w-full lg:w-[40%] flex flex-col items-center justify-center">
        <h2 className="font-semibold text-lg text-gray-700 mb-4">Service Status Overview</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-1 w-full flex gap-2 text-[10px] text-gray-600">
          {pieData.map((item, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span
                className="w-3 h-3 inline-block rounded-full"
                style={{ backgroundColor: COLORS[i] }}
              ></span>
              {item.name}: {item.value}
            </div>
          ))}
        </div>
      </div>
      {/* Latest Completed Services (Right Side, 60%) */}
      <div className="bg-white p-6 rounded-[20px] shadow-md w-full lg:w-[60%]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-gray-700 mb-4">Latest Completed Services</h2>
          <select value={filterProgress} onChange={e => setFilterProgress(e.target.value)} className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm">
            <option value="">All Progress</option>
            <option value="under_review">Under Review</option>
            <option value="challan_pending">Challan Pending</option>
            <option value="objection">Objection</option>
            <option value="name_reserved">Name Reserved</option>
            <option value="file_submitted">File Submitted</option>
            <option value="objection_resolved">Objection Resolved</option>
            <option value="incorporated">Incorporated</option>
            <option value="case_holding">Case Holding</option>
            <option value="case_rejected">Case Rejected</option>
            <option value="case_refund">Case Refund</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="text-gray-600 bg-gray-50">
                <th className="text-left py-3 px-4">Lead Name</th>
                <th className="text-left py-3 px-4">Service</th>
                <th className="text-left py-3 px-4">Completed At</th>
                <th className="text-left py-3 px-4">Certification</th>
              </tr>
            </thead>
            <tbody>
              {filteredLatest.map((service, index) => (
                <tr key={index} className="hover:bg-gray-50 border-t">
                  <td className="py-3 px-4">{service.name}</td>
                  <td className="py-3 px-4 truncate max-w-[180px]">{service.service}</td>
                  <td className="py-3 px-4">{service.completedAt ? new Date(service.completedAt).toLocaleDateString() : '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-3 justify-center w-full">
                      <button className="text-[#57123f] hover:underline " onClick={() => handleDownload(service.certificate)}><FaDownload /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Toaster position="top-right" reverseOrder={false} />
      </div>
    </div>
  );
};

export default ServiceProcessing;
