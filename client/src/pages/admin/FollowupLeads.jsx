import { useState, useEffect } from 'react';
import { serviceData } from '../../data/serviceSchemas';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { sendSms } from '../../utils/sms';
import LeadsTable from '../../components/leads/LeadsTable';
import LeadsSearchBar from '../../components/leads/LeadsSearchBar';
import LeadsHeaderButtons from '../../components/leads/LeadsHeaderButtons';
import { toast as hotToast } from 'react-hot-toast';
import ConvertLeadModal from '../../components/leads/ConvertLeadModal';
import { Navigate } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';

const FollowupLeads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Follow-up Leads');
  const [leads, setLeads] = useState([]);
  const [editModal, setEditModal] = useState({ open: false, lead: null });
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

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await axios.get('https://app.zumarlawfirm.com/leads');
      setLeads(res.data);
    } catch (err) {
      setLeads([]);
    }
  };

  const [selectedRows, setSelectedRows] = useState([]);
  const allRowIds = leads
    .filter(lead => lead.status === 'Followup')
    .map(lead => `${lead._id}`);
  const isAllSelected = selectedRows.length === allRowIds.length && allRowIds.length > 0;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedRows([]);
    else setSelectedRows(allRowIds);
  };

  const handleSelectRow = (rowId) => {
    setSelectedRows(prev => prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]);
  };

  const handleStatusChange = async (leadId, value) => {
    // find the lead for phone number
    const lead = leads.find(l => l._id === leadId);
    try {
      await axios.put(`https://app.zumarlawfirm.com/leads/${leadId}/status`, { status: value });

      // If status changed to Mature, attempt to send SMS to lead phone
      if (String(value).toLowerCase() === 'Mature') {
        try {
          const phone = lead?.phone;
          if (phone) {
            const message = 'From Zumar law firm your case are mature now .';
            await sendSms({ to: phone, message });
            hotToast.success('SMS sent to lead');
          } else {
            hotToast('Lead has no phone number to send SMS');
          }
        } catch (smsErr) {
          console.error('SMS send failed', smsErr);
          hotToast.error('Failed to send SMS to lead');
        }
      }
    } catch (err) {
      console.error('Failed to update lead status', err);
      toast.error('Failed to update status');
    }

    // Update local state regardless (optimistic)
    setLeads(prev => {
      // Update status and remove from current page if status changes
      let updated = prev.map(lead => lead._id === leadId ? { ...lead, status: value } : lead);
      // Only keep leads with status 'Followup' in the current page
      updated = updated.filter(lead => lead.status === 'Followup');
      return updated;
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((prev) => ({ ...prev, lead: { ...prev.lead, [name]: value } }));
  };

  const handleEditSave = async () => {
    try {
      await axios.put(`https://app.zumarlawfirm.com/leads/${editModal.lead._id}`, editModal.lead);
      setLeads(prev => prev.map(l => l._id === editModal.lead._id ? { ...editModal.lead } : l));
      setEditModal({ open: false, lead: null });
      toast.success('Lead updated successfully');
    } catch (err) {
      toast.error('Failed to update lead');
    }
  };

  // Delete lead handler
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await axios.delete(`https://app.zumarlawfirm.com/leads/${leadId}`);
      setLeads(prev => prev.filter(l => l._id !== leadId));
      setSelectedRows(prev => prev.filter(id => id !== leadId));
      toast.success('Lead deleted successfully');
    } catch (err) {
      toast.error('Failed to delete lead');
    }
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

  // Dynamic tab counts and tab definitions
  const tabCounts = {
    "New": leads.filter(l => l.status === "New").length,
    "Mature Leads": leads.filter(l => l.status === "Mature").length,
    "Follow-up Leads": leads.filter(l => l.status === "Follow-ups" || l.status === "Follow-up").length,
    "Contacted Leads": leads.filter(l => l.status === "Contacted").length,
  };
  const tabs = [
    { name: "New", count: tabCounts["New"], link: "/admin/leads" },
    { name: "Mature Leads", count: tabCounts["Mature Leads"], link: "/admin/leads/mature" },
    { name: "Follow-up Leads", count: tabCounts["Follow-up Leads"], link: "/admin/leads/followup" },
    { name: "Contacted Leads", count: tabCounts["Contacted Leads"], link: "/admin/leads/contacted" },
  ];

  // Only show leads with status 'Follow-up' or 'Follow-ups'
  const followupLeads = leads.filter(lead => lead.status === 'Follow-up' || lead.status === 'Follow-ups');

  // Filter followupLeads based on searchTerm (name, phone, CNIC, email)
  const filteredLeads = followupLeads.filter(lead => {
    const term = searchTerm.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(term)) ||
      (lead.phone && lead.phone.toLowerCase().includes(term)) ||
      (lead.cnic && lead.cnic.toLowerCase().includes(term)) ||
      (lead.email && lead.email.toLowerCase().includes(term))
    );
  });

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
      await axios.post('https://app.zumarlawfirm.com/convertedService', formData, {
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

      {/* Breadcrumb */}
     <Breadcrumbs items={[
       { label: 'Dashboard', link: '/admin' },
       { label: 'Leads Management', link: '/admin/leads' },
       { label: 'Followup Leads' }
     ]} />

    <LeadsHeaderButtons
      title='Followup Leads'
      onAddClick={() => <Navigate to='/admin/leads/add' />}
      onImportClick={() => <Navigate to='/admin/leads/import' />}
      setConvertModal={setConvertModal}
      selectedRows={selectedRows}
      convertFindLeads={followupLeads}
      toast={window.toast && window.toast.error ? window.toast : { error: (msg) => hotToast.error(msg) }}
    />

      {/* Search Bar & Tabs */}
      <LeadsSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        tabs={tabs}
        currentPage={activeTab}
        onPageClick={setActiveTab}
      />

    
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
    </div>
  );
};

export default FollowupLeads;
