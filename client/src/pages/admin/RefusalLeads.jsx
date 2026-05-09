import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';
import LeadsHeaderButtons from '../../components/leads/LeadsHeaderButtons';
import LeadsSearchBar from '../../components/leads/LeadsSearchBar';
import LeadsTable from '../../components/leads/LeadsTable';
import { getLeadTabs, isRefusalLeadStatus } from '../../utils/leadTabs';
import api from '../../utils/api';
import { exportRecordsToCsv } from '../../utils/exportCsv';

const RefusalLeads = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Refusal Leads');
  const [leads, setLeads] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/api/leads');
      setLeads(res.data);
    } catch (err) {
      setLeads([]);
    }
  };

  const refusalLeads = leads.filter((lead) => isRefusalLeadStatus(lead.status));
  const allRowIds = refusalLeads.map((lead) => lead._id);
  const isAllSelected = selectedRows.length === allRowIds.length && allRowIds.length > 0;

  const filteredLeads = refusalLeads.filter((lead) => {
    const term = searchTerm.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(term)) ||
      (lead.phone && lead.phone.toLowerCase().includes(term)) ||
      (lead.cnic && lead.cnic.toLowerCase().includes(term)) ||
      (lead.email && lead.email.toLowerCase().includes(term))
    );
  });

  const handleSelectAll = () => {
    setSelectedRows(isAllSelected ? [] : allRowIds);
  };

  const handleSelectRow = (rowId) => {
    setSelectedRows((prev) => prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]);
  };

  const handleStatusChange = async (leadId, status) => {
    try {
      const res = await api.put(`/api/leads/${leadId}/status`, { status });
      const updatedLead = res.data?.lead;
      setLeads((prev) => prev.map((lead) => lead._id === leadId ? { ...lead, ...(updatedLead || {}), status } : lead));
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    try {
      await api.delete(`/api/leads/${leadId}`);
      setLeads((prev) => prev.filter((lead) => lead._id !== leadId));
      setSelectedRows((prev) => prev.filter((id) => id !== leadId));
      toast.success('Lead deleted successfully');
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="w-auto space-y-5 py-6 bg-white">
      <Breadcrumbs items={[
        { label: 'Dashboard', link: '/admin' },
        { label: 'Leads Management', link: '/admin/leads' },
        { label: 'Refusal Leads' }
      ]} />

      <LeadsHeaderButtons
        title="Refusal Leads"
        onAdd={() => navigate('/admin/leads/add')}
        onImport={() => navigate('/admin/leads/import')}
        selectedRows={selectedRows}
        convertFindLeads={refusalLeads}
        toast={{ error: (msg) => toast.error(msg) }}
        onExport={() => exportRecordsToCsv('refusal-leads.csv', filteredLeads)}
      />

      <LeadsSearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        tabs={getLeadTabs(leads)}
        currentPage={activeTab}
        onPageClick={setActiveTab}
      />

      <LeadsTable
        leads={filteredLeads}
        selectedRows={selectedRows}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onStatusChange={handleStatusChange}
        onAction={(type, lead) => type === 'Delete' && handleDeleteLead(lead._id)}
        isAllSelected={isAllSelected}
      />
    </div>
  );
};

export default RefusalLeads;
