import React from 'react';
import { FaUserPlus, FaFileImport, FaArrowRight } from 'react-icons/fa';
import {toast} from 'react-hot-toast';
const LeadsHeaderButtons = ({
  title = '',
  onAdd,
  onImport,
  onConvert,
  addLabel = 'Add Lead',
  selectedRows = [],
  leads = [],
  toast,
  setConvertModal,
  convertLabel = 'Convert into Client',
  convertFindLeads = [],
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="flex gap-2">
        <button
          className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg text-sm"
          onClick={onAdd}
        >
          <FaUserPlus /> {addLabel}
        </button>
        <button
          className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg text-sm"
          onClick={onImport}
        >
          <FaFileImport /> Import Leads (.csv)
        </button>
        <button
          className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg text-sm"
          onClick={() => {
            if (selectedRows.length === 0) {
              if (toast && toast.error) toast.error('Please select at least one lead to convert.');
              return;
            }
            // Only allow one at a time for simplicity
            const lead = convertFindLeads.find(l => l._id === selectedRows[0]);
            if (!lead) {
              if (toast && toast.error) toast.error('Selected lead not found.');
              return;
            }
            if (setConvertModal) setConvertModal({ open: true, lead });
          }}
        >
          <FaArrowRight /> {convertLabel}
        </button>
      </div>
    </div>
  );
};

export default LeadsHeaderButtons;
