import React, { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import MaintenanceControl from './MaintenanceControl';
import { FaSlidersH } from 'react-icons/fa';
import axios from 'axios';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const Topbar = () => {
  const [superAdmin, setSuperAdmin] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) axios.get(`${apiUrl}/api/system/access`, { headers: { Authorization: `Bearer ${token}` } }).then(() => setSuperAdmin(true)).catch(() => { });
  }, []);
  return (
    <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
      <div className="flex items-center gap-4">
        <MaintenanceControl />
        {superAdmin && <Link to="/admin/api-controls" className="flex items-center gap-2 rounded bg-[#57123f] px-3 py-2 text-xs font-semibold text-white"><FaSlidersH /> API Controls</Link>}
        <input
          type="text"
          placeholder="Search"
          className="border p-2 rounded w-56 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-4">
        <Link to="/admin/announcment" className="relative group">
          <FaBell className="text-[#57123f] text-2xl group-hover:text-yellow-500 transition duration-200" />
          <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5 shadow group-hover:bg-[#57123f] group-hover:text-yellow-500 transition duration-200">!</span>
        </Link>

      </div>
    </header>
  );
};

export default Topbar;
