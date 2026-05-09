export const isNewLeadStatus = (status) => status === 'New' || status === 'New Lead';
export const isFollowUpLeadStatus = (status) => status === 'Follow-up' || status === 'Follow-ups' || status === 'Followup';
export const isRefusalLeadStatus = (status) => status === 'Refusal';

export const getLeadTabs = (leads = []) => {
  const tabCounts = {
    newLeads: leads.filter((lead) => isNewLeadStatus(lead.status)).length,
    matureLeads: leads.filter((lead) => lead.status === 'Mature').length,
    followUpLeads: leads.filter((lead) => isFollowUpLeadStatus(lead.status)).length,
    contactedLeads: leads.filter((lead) => lead.status === 'Contacted').length,
    refusalLeads: leads.filter((lead) => isRefusalLeadStatus(lead.status)).length,
  };

  return [
    { name: 'New Leads', count: tabCounts.newLeads, link: '/admin/leads' },
    { name: 'Mature Leads', count: tabCounts.matureLeads, link: '/admin/leads/mature' },
    { name: 'Follow-up Leads', count: tabCounts.followUpLeads, link: '/admin/leads/followup' },
    { name: 'Contacted Leads', count: tabCounts.contactedLeads, link: '/admin/leads/contacted' },
    { name: 'Refusal Leads', count: tabCounts.refusalLeads, link: '/admin/leads/refusal' },
  ];
};
