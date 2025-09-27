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
      className="cursor-pointer bg-white rounded-xl border border-gray-200 hover:shadow-[0_0_15px_rgba(87,18,63,0.25)] transition-all duration-200 p-4 w-full flex flex-col items-center text-center group"
    >
      {/* Icon container */}
      <div className="bg-[#57123f] text-white p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
        {Icon && <img src={Icon} alt={title} className="w-6 h-6" />}
      </div>

      {/* Service Title */}
      <h4 className="text-sm font-medium text-[#57123f]">{title}</h4>

      {/* Status */}
      {status && (
        <span className="mt-2 text-xs bg-[#ecd4bc] text-[#57123f] px-2 py-0.5 rounded-full">
          {status}
        </span>
      )}
    </div>
  );
};

export default ServiceCard;
