import React from 'react';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Topbar = () => {
  return (
    <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
      <input
        type="text"
        placeholder="Search"
        className="border p-2 rounded w-1/3 focus:outline-none"
      />
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