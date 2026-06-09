export const isNewLeadStatus = (status) => status === 'New' || status === 'New Lead';
export const isFollowUpLeadStatus = (status) => status === 'Follow-up' || status === 'Follow-ups' || status === 'Followup';
export const isRefusalLeadStatus = (status) => status === 'Refusal';

export const getLeadFollowUps = (lead = {}) => Array.isArray(lead.followUps) ? lead.followUps : [];

export const getFollowUpStageNumber = (lead = {}) => {
  const completedFollowUps = getLeadFollowUps(lead).length;
  if (completedFollowUps <= 0) return 1;
  if (completedFollowUps === 1) return 2;
  return 3;
};

export const getFollowUpStageLabel = (lead = {}) => {
  const stage = getFollowUpStageNumber(lead);
  if (stage === 1) return 'First Follow-up';
  if (stage === 2) return '2nd Follow-up';
  return '3rd Follow-up';
};

export const getFollowUpDate = (lead = {}) => {
  const followUps = getLeadFollowUps(lead);
  const latestWithNextDate = followUps
    .slice()
    .reverse()
    .find((followUp) => followUp?.nextFollowUpAt);

  return latestWithNextDate?.nextFollowUpAt || lead.autoFollowUpAt || lead.statusChangedAt || lead.createdAt || lead.date || '';
};

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
