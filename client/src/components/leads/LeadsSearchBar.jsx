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
    { name: 'Refusal Leads', count: 0, link: '/admin/leads/refusal' },
  ],
}) => {
  return (
    <div className="flex flex-col items-start max-w-full justify-start gap-4 mb-4 overflow-x-auto">
      {/* Search Bar */}
      <div className="flex gap-2 max-w-full ">
        <input
          type="text"
          placeholder="Search by name, phone, CNIC, email"
          className="border px-4 py-2 rounded w-[900px]"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      {/* Lead Page Buttons */}
      {/* Filters */}
        <div className="flex flex-row gap-3 flex-nowrap shrink-0">
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
