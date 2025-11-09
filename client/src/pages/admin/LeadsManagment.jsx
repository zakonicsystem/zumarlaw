import { useState, useEffect } from "react";
import axios from "axios";
import { serviceData } from '../../data/serviceSchemas';
import { Link, useNavigate } from "react-router-dom";
import LeadsTable from "../../components/leads/LeadsTable";
import { toast } from "react-hot-toast";
import LeadsSearchBar from "../../components/leads/LeadsSearchBar";
import LeadsHeaderButtons from "../../components/leads/LeadsHeaderButtons";
import { toast as hotToast } from 'react-hot-toast';
import Breadcrumbs from "../../components/Breadcrumbs";
import ConvertLeadModal from "../../components/leads/ConvertLeadModal";


export default function LeadsManagment() {
  const navigate = useNavigate();
  const [editModal, setEditModal] = useState({ open: false, lead: null });
  const [activeTab, setActiveTab] = useState("All Leads");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [leads, setLeads] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const leadsPerPage = 5;
  const allRowIds = leads
    .filter(lead => lead.status === 'New')
    .map(lead => `${lead._id}`);
  const isAllSelected = selectedRows.length === allRowIds.length && allRowIds.length > 0;

  // Dynamic tab counts
  const tabCounts = {
    "All Leads": leads.filter(l => l.status === "New").length,
    "Mature Leads": leads.filter(l => l.status === "Mature").length,
    "Follow-up Leads": leads.filter(l => l.status === "Follow-ups" || l.status === "Follow-up").length,
    "Contacted Leads": leads.filter(l => l.status === "Contacted").length,
  };
  const tabs = [
    { name: "All Leads", count: tabCounts["All Leads"], link: "/admin/leads" },
    { name: "Mature Leads", count: tabCounts["Mature Leads"], link: "/admin/leads/mature" },
    { name: "Follow-up Leads", count: tabCounts["Follow-up Leads"], link: "/admin/leads/followup" },
    { name: "Contacted Leads", count: tabCounts["Contacted Leads"], link: "/admin/leads/contacted" },
  ];
  // Only show leads with status 'New'
  const NewLeads = leads.filter(lead => lead.status === 'New');

  const statusColor = {
    "New Lead": "bg-purple-100 text-[#57123f]",
    "Follow-up": "bg-yellow-100 text-yellow-700",
    "Contacted": "bg-green-100 text-green-700",
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get("http://localhost:5000/leads");
      setLeads(res.data);
    } catch (err) {
      setLeads([]);
    }
  };
  const handleStatusChange = async (leadId, value) => {
    try {
      await axios.put(`http://localhost:5000/leads/${leadId}/status`, { status: value });
    } catch (err) { }
    setLeads(prev => {
      // Update status and remove from current page if status changes
      let updated = prev.map(lead => lead._id === leadId ? { ...lead, status: value } : lead);
      // Only keep leads with status 'Mature' in the current page
      updated = updated.filter(lead => lead.status === 'Mature');
      return updated;
    });
  };
  const handleAction = (type, lead) => {
    if (type === 'Edit') {
      setEditModal({ open: true, lead });
    } else if (type === 'Delete') {
      handleDeleteLead(lead._id);
    } else {
      toast.success(`${type} action triggered for ${lead.name}`);
    }
  };

  // Filter leads by search, date, and status 'New'
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDate = filterDate
      ? (lead.createdAt && new Date(lead.createdAt).toISOString().slice(0, 10) === filterDate)
      : true;

    const isNewStatus = (lead.status === 'New' || lead.status === 'New Lead');

    return matchesSearch && matchesDate && isNewStatus;
  });

  const indexOfLast = currentPage * leadsPerPage;
  const indexOfFirst = indexOfLast - leadsPerPage;
  const paginatedLeads = filteredLeads.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  // Action handlers
  const handleView = (leadId) => {
    navigate(`/admin/leads/view/${leadId}`);
  };

  const handleEdit = (leadId) => {
    const lead = leads.find(l => l._id === leadId);
    setEditModal({ open: true, lead });
  };
  const handleSelectAll = () => {
    if (isAllSelected) setSelectedRows([]);
    else setSelectedRows(allRowIds);
  };

  const handleSelectRow = (rowId) => {
    setSelectedRows(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((prev) => ({ ...prev, lead: { ...prev.lead, [name]: value } }));
  };

  const handleEditSave = async () => {
    try {
      await axios.put(`http://localhost:5000/leads/${editModal.lead._id}`, editModal.lead);
      setLeads(prev => prev.map(l => l._id === editModal.lead._id ? { ...editModal.lead } : l));
      setEditModal({ open: false, lead: null });
    } catch (err) {
      alert('Failed to update lead');
    }
  };

  const handleDelete = async (leadId) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      try {
        await axios.delete(`http://localhost:5000/leads/${leadId}`);
        setLeads(prev => prev.filter(l => l._id !== leadId));
      } catch (err) {
        alert("Failed to delete lead.");
      }
    }
  };

  // Get dynamic fields for selected service
  const getServiceFields = (service) => {
    return serviceData.fields[service] || [];
  };

  // Handle field change
  const handleConvertFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConvertFields(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  // Handle file change for main fields
  const handleConvertFileChange = (e) => {
    const { name, files } = e.target;
    setConvertFiles(prev => ({ ...prev, [name]: files[0] }));
  };

  // Handle member CNIC file change
  const handleMemberCnicFileChange = (idx, side, file) => {
    setMemberCnics(prev => prev.map((item, i) => i === idx ? { ...item, [side]: file } : item));
  };

  // Add a new member CNIC field set
  const handleAddMemberCnic = () => {
    setMemberCnics(prev => [...prev, { front: null, back: null }]);
  };

  // Remove a member CNIC field set
  const handleRemoveMemberCnic = (idx) => {
    setMemberCnics(prev => prev.filter((_, i) => i !== idx));
  };
  const [convertModal, setConvertModal] = useState({ open: false, lead: null });
  const [convertFields, setConvertFields] = useState({});
  const [convertFiles, setConvertFiles] = useState({});
  const [submittingConvert, setSubmittingConvert] = useState(false);
  // For dynamic member CNICs
  const [memberCnics, setMemberCnics] = useState([]); // [{front: null, back: null}]
  // For dynamic additional member details (email, phone)
  const [memberDetails, setMemberDetails] = useState([]); // [{email: '', phone: ''}]
  // Handle member details change
  const handleMemberDetailChange = (idx, field, value) => {
    setMemberDetails(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Add a new member detail field set
  const handleAddMemberDetail = () => {
    setMemberDetails(prev => [...prev, { email: '', phone: '' }]);
  };

  // Remove a member detail field set
  const handleRemoveMemberDetail = (idx) => {
    setMemberDetails(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit converted lead
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setSubmittingConvert(true);
    const formData = new FormData();
    // Add lead info
    Object.entries(convertModal.lead).forEach(([key, value]) => {
      formData.append(key, value);
    });
    // Add originalLeadId for backend deletion
    if (convertModal.lead && convertModal.lead._id) {
      formData.append('originalLeadId', convertModal.lead._id);
    }
    // Add dynamic fields
    Object.entries(convertFields).forEach(([key, value]) => {
      // Special handling for paymentReceivedDate: ensure correct key for backend
      if (key === 'paymentReceivedDate') {
        formData.append('paymentReceivedDate', value);
      } else {
        formData.append(key, value);
      }
    });
    // Add dynamic fields
    Object.entries(convertFields).forEach(([key, value]) => {
      // For remainingAmount, always recalculate to ensure backend gets correct value
      if (key === 'remainingAmount') {
        const total = Number(convertFields.totalPayment) || 0;
        const current = Number(convertFields.currentReceivingPayment) || 0;
        formData.append('remainingAmount', Math.max(total - current, 0));
      } else {
        formData.append(key, value);
      }
    });
    // Add files
    Object.entries(convertFiles).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });
    // Add member CNIC files
    memberCnics.forEach((item, idx) => {
      if (item.front) formData.append(`memberCnic[${idx}][front]`, item.front);
      if (item.back) formData.append(`memberCnic[${idx}][back]`, item.back);
    });
    // Add member details
    memberDetails.forEach((item, idx) => {
      if (item.email) formData.append(`memberDetail[${idx}][email]`, item.email);
      if (item.phone) formData.append(`memberDetail[${idx}][phone]`, item.phone);
    });
    try {
      await axios.post('http://localhost:5000/convertedService', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Lead converted and submitted!');
      setConvertModal({ open: false, lead: null });
      setConvertFields({});
      setConvertFiles({});
      setMemberCnics([]);
      setMemberDetails([]);
    } catch (err) {
      toast.error('Failed to convert lead');
    } finally {
      setSubmittingConvert(false);
    }
  };

  return (
    <div className="w-auto space-y-5 py-6 bg-white">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Dashboard', link: '/admin' },
        { label: 'Leads Management', link: '/admin/leads' }
      ]} />

      {/* Header & Actions */}
      <LeadsHeaderButtons
        title="Leads Management"
        onAdd={() => navigate('/admin/leads/add')}
        onImport={() => navigate('/admin/leads/import')}
        setConvertModal={setConvertModal}
        selectedRows={selectedRows}
        convertFindLeads={NewLeads}
        toast={window.toast && window.toast.error ? window.toast : { error: (msg) => hotToast.error(msg) }}
      />
      {/* Search Bar */}
      <LeadsSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        tabs={tabs}
        currentPage={activeTab}
        onPageClick={setActiveTab}
      />

      {/* Table */}
      <LeadsTable
        leads={filteredLeads}
        selectedRows={selectedRows}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onStatusChange={handleStatusChange}
        onAction={handleAction}
        isAllSelected={isAllSelected}
      />
      <ConvertLeadModal
        open={convertModal.open}
        lead={convertModal.lead}
        convertFields={convertFields}
        convertFiles={convertFiles}
        memberCnics={memberCnics}
        memberDetails={memberDetails}
        submittingConvert={submittingConvert}
        onClose={() => setConvertModal({ open: false, lead: null })}
        onFieldChange={handleConvertFieldChange}
        onFileChange={handleConvertFileChange}
        onMemberCnicFileChange={handleMemberCnicFileChange}
        onAddMemberCnic={handleAddMemberCnic}
        onRemoveMemberCnic={handleRemoveMemberCnic}
        onAddMemberDetail={handleAddMemberDetail}
        onRemoveMemberDetail={handleRemoveMemberDetail}
        onMemberDetailChange={handleMemberDetailChange}
        onSubmit={handleConvertSubmit}
        getServiceFields={getServiceFields}
      />
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 px-2 pt-4 items-center">
          <button
            className={`px-3 py-1 rounded border bg-white text-gray-700 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              if (totalPages <= 5) return true;
              if (currentPage <= 3) return page <= 3 || page === totalPages;
              if (currentPage >= totalPages - 2) return page >= totalPages - 2 || page === 1;
              return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
            })
            .map((page, idx, arr) => (
              <>
                {idx > 0 && page !== arr[idx - 1] + 1 && (
                  <span key={`ellipsis-${page}`} className="px-2">...</span>
                )}
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded border ${currentPage === page
                      ? "bg-[#57123f] text-white"
                      : "bg-white text-gray-700"
                    }`}
                >
                  {page}
                </button>
              </>
            ))}
          <button
            className={`px-3 py-1 rounded border bg-white text-gray-700 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}

    </div>
  );
}
