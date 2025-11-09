import api from './api';

// Client helper to send SMS via server proxy
export async function sendSms({ to, message, sender, network } = {}) {
  if (!to || !message) throw new Error('to and message are required');
  const payload = { to, message };
  if (sender) payload.sender = sender;
  if (network) payload.network = network;

  const res = await api.post('/sms/send', payload);
  return res.data;
}
