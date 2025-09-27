import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const Breadcrumbs = ({ items }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // If items are not provided, auto-generate from path
  let crumbs = items;
  if (!crumbs) {
    const pathnames = location.pathname.split('/').filter(Boolean);
    crumbs = [
      { label: 'Dashboard', link: '/admin' },
      ...pathnames.map((name, idx) => {
        // Capitalize and prettify
        const pretty = name
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        return {
          label: pretty,
          link: '/' + pathnames.slice(0, idx + 1).join('/'),
        };
      }),
    ];
  }

  return (
    <nav className="text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
      {crumbs.map((crumb, idx) => (
        <span key={idx}>
          {idx > 0 && <span className="mx-1">&gt;</span>}
          {crumb.link && idx !== crumbs.length - 1 ? (
            <button
              type="button"
              className="cursor-pointer text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => navigate(crumb.link)}
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-gray-800 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
