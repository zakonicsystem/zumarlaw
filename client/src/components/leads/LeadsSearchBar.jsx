import React from 'react';
import { Link } from 'react-router-dom';

const LeadsSearchBar = ({
  searchTerm = '',
  onSearchChange,
  onPageClick,
  pageCounts = {},
  currentPage = '',
  tabs = [
    { name: 'New', count: 0, link: '/admin/leads' },
    { name: 'Mature Leads', count: 0, link: '/admin/leads/mature' },
    { name: 'Follow-up Leads', count: 0, link: '/admin/leads/followup' },
    { name: 'Contacted Leads', count: 0, link: '/admin/leads/contacted' },
  ],
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by name, phone, CNIC, email"
          className="border px-4 py-2 rounded w-64"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      {/* Lead Page Buttons */}
      {/* Filters */}
        <div className="flex gap-3 flex-wrap">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                to={tab.link}
                className={`px-4 py-2 text-xs rounded-full border font-semibold ${
                  currentPage === tab.name
                    ? "bg-[#57123f] text-white border-[#57123f]"
                    : "bg-gray-100 text-gray-800 border-gray-300"
                }`}
                onClick={() => onPageClick && onPageClick(tab.name)}
              >
                {tab.name} <span className="ml-1">({tab.count})</span>
              </Link>
            ))}
        </div>
    </div>
  );
};

export default LeadsSearchBar;
