import React from 'react';
import { useNavigate } from 'react-router-dom';

const ServiceCard = ({ title, status, Icon }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/add-details/${encodeURIComponent(title)}`);
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-white rounded-xl border border-gray-200 hover:shadow-[0_0_15px_rgba(87,18,63,0.25)] transition-all duration-200 p-4 w-full flex flex-col items-center text-center group min-h-[180px]"
    >
      {/* Content area - grows to push CTA to bottom */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Icon container */}
        <div className="bg-[#57123f] text-white p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
          {Icon && <img src={Icon} alt={title} className="w-6 h-6" />}
        </div>

        {/* Service Title */}
        <h4 className="text-sm font-medium text-[#57123f] px-2 break-words">{title}</h4>

        {/* Status */}
        {status && (
          <span className="mt-2 text-xs bg-[#ecd4bc] text-[#57123f] px-2 py-0.5 rounded-full">
            {status}
          </span>
        )}
      </div>

      {/* CTA Button - stays at bottom */}
      <div className="w-full flex justify-center mt-4">
        <button
          aria-label={`Click to view ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="inline-flex items-center gap-2 bg-[#57123f] text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow hover:opacity-95 transition"
        >
          Click Here
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;
