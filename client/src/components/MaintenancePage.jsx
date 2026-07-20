import React from 'react';
import { FaTools } from 'react-icons/fa';
import logo from '../assets/ZumarLogo.png';

const MaintenancePage = ({ message }) => (
  <div className="min-h-screen bg-[#57123f] px-4 py-12 flex items-center justify-center">
    <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="bg-[#57123f] px-8 py-7 text-center">
        <img src={logo} alt="Zumar Law Firm" className="mx-auto w-full max-w-sm" />
      </div>
      <div className="px-8 py-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-2xl text-[#57123f]">
          <FaTools aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">System Maintenance</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-600">
          {message || 'The Zumar Law Firm system is temporarily unavailable for scheduled maintenance.'}
        </p>
        <p className="mt-5 text-xs text-gray-500">Please check again shortly. We appreciate your patience.</p>
      </div>
    </div>
  </div>
);

export default MaintenancePage;
