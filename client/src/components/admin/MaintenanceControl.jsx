import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaCode, FaPowerOff } from 'react-icons/fa';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const MaintenanceControl = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    Promise.all([
      axios.get(`${apiUrl}/api/system/access`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${apiUrl}/api/system/status`),
    ])
      .then(([, statusResponse]) => {
        setAuthorized(true);
        setEnabled(statusResponse.data.maintenanceMode === true);
      })
      .catch(() => setAuthorized(false));
  }, []);

  if (!authorized) return null;

  const toggleMaintenance = async () => {
    const nextEnabled = !enabled;
    const prompt = nextEnabled
      ? 'Enable maintenance mode? All clients, employees, and regular admins will be locked out.'
      : 'Disable maintenance mode and reopen the system for everyone?';
    if (!window.confirm(prompt)) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.put(
        `${apiUrl}/api/system/maintenance`,
        { enabled: nextEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnabled(data.maintenanceMode === true);
      window.dispatchEvent(new CustomEvent('maintenance-changed', {
        detail: { maintenanceMode: data.maintenanceMode, message: data.maintenanceMessage },
      }));
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
      <FaCode className="text-[#57123f]" />
      <div className="hidden xl:block leading-tight">
        <div className="text-xs font-bold text-[#57123f]">Developer Mode</div>
        <div className="text-[10px] text-gray-500">Super Admin only</div>
      </div>
      <button
        type="button"
        onClick={toggleMaintenance}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${enabled ? 'bg-green-700 hover:bg-green-800' : 'bg-[#57123f] hover:bg-[#711852]'}`}
        title={enabled ? 'Turn maintenance mode off' : 'Turn maintenance mode on'}
      >
        <FaPowerOff />
        {loading ? 'Saving...' : enabled ? 'Maintenance ON' : 'Maintenance OFF'}
      </button>
    </div>
  );
};

export default MaintenanceControl;
