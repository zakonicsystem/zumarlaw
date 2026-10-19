export const ticketSubjects = ['Employee Behaviour', 'Service Related Problem', 'Refund Service Fee', 'Other'];
export const ticketStatuses = ['pending', 'under_review', 'resolved', 'completed'];
export const normalizeTicketStatus = status => ({ open: 'pending', in_progress: 'under_review' }[status] || status);
