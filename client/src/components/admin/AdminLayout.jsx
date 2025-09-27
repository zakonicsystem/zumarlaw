import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const AdminLayout = () => {
  // Sidebar.jsx now handles both admin and employee logic
  const sidebarComponent = <Sidebar />;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Fixed */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        {sidebarComponent}
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Topbar - Fixed */}
        <div className="fixed top-0 right-0 left-64 bg-white shadow-sm z-10">
          <Topbar />
        </div>

        {/* This is where Dashboard.jsx content appears */}
        <div className="pt-20 p-6 space-y-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
