export function ticketSubmitter(ticket) {
  if (ticket.createdByRole === 'admin') return { name: 'Admin', role: 'Administrator' };
  if (ticket.createdByRole === 'employee') return { name: ticket.createdByName || 'Employee', role: 'Employee' };
  return { name: ticket.createdByName || ticket.name || 'Client', role: 'Client' };
}
