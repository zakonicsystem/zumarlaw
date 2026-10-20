import { EMAIL_LOGO_CID, escapeEmailHtml as escape } from './brandedEmail.js';

function supportUrl() {
  try {
    const origin = new URL(process.env.CLIENT_URL || 'https://app.zumarlawfirm.com');
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Invalid portal URL');
    return new URL('/support', origin).href;
  } catch { return 'https://app.zumarlawfirm.com/support'; }
}
const paragraph = value => escape(value).replace(/\r?\n/g, '<br>');
const date = value => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' (PKT)' : '';

export function buildTicketEmail(ticket, event) {
  const received = event === 'created';
  const status = received ? 'Pending review' : ticket.status === 'completed' ? 'Completed' : 'Resolved';
  const title = received ? 'Your ticket is in good hands.' : `Your support request is ${ticket.status === 'completed' ? 'completed' : 'resolved'}.`;
  const intro = received
    ? 'Thank you for contacting Zumar Law Firm. Your ticket has been received and is waiting for our support team to review it. We will notify you when it is resolved.'
    : 'Our team has reviewed your request and recorded the resolution below. Thank you for giving us the opportunity to help.';
  const reference = ticket.reference || 'Support ticket';
  const greeting = `Dear ${ticket.name || 'Valued Client'},`;
  const timestamp = date(received ? ticket.createdAt : ticket.resolvedAt);
  const subject = `${received ? 'Ticket received' : status === 'Completed' ? 'Ticket completed' : 'Ticket resolved'} | ${reference} | Zumar Law Firm`;
  const link = supportUrl();
  const details = [
    ['Ticket reference', reference], ['Subject', ticket.subject || ticket.category || 'Support request'],
    ['Category', ticket.category || 'Other'], ...(ticket.serviceName ? [['Service', ticket.serviceName]] : []),
    ['Status', status], ...(timestamp ? [[received ? 'Submitted on' : 'Closed on', timestamp]] : []),
  ];
  const rows = details.map(([label, value]) => `<tr><td width="35%" style="padding:12px 14px;border-bottom:1px solid #eee6ec;color:#796b76;font-size:12px;vertical-align:top;">${escape(label)}</td><td style="padding:12px 14px;border-bottom:1px solid #eee6ec;color:#29232b;font-size:13px;font-weight:bold;word-break:break-word;">${escape(value)}</td></tr>`).join('');
  const text = `${greeting}\n\n${title}\n${intro}\n\n${details.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${received ? 'Your issue' : 'Resolution'}:\n${received ? ticket.description || '' : ticket.resolution || ''}\n\n${received ? 'Keep your ticket reference handy when contacting support.' : 'If you need further assistance, contact our support team and quote your ticket reference.'}\nView your tickets: ${link}\n\nWarm regards,\nClient Support Team\nZumar Law Firm\nHelpline: 051-8445095\nEmail: team@zumarlawfirm.com`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f1f4;font-family:Arial,Helvetica,sans-serif;color:#29232b;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(`${reference} · ${status}. ${received ? 'We have received your support request.' : 'Read the resolution from our team.'}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1f4;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:white;border:1px solid #e7dce4;border-radius:16px;overflow:hidden;">
<tr><td align="center" style="padding:28px 24px;background:#57123f;"><img src="cid:${EMAIL_LOGO_CID}" width="230" alt="Zumar Law Firm" style="display:block;width:100%;max-width:230px;height:auto;border:0;"><p style="margin:15px 0 0;color:#ecd4bc;font-size:10px;letter-spacing:3px;font-weight:bold;">CLIENT CARE &amp; SUPPORT</p></td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:#d5b38a;">&nbsp;</td></tr>
<tr><td style="padding:30px 28px 12px;"><span style="display:inline-block;border-radius:20px;padding:7px 13px;font-size:11px;letter-spacing:1px;font-weight:bold;background:${received ? '#fff4df' : '#e8f5ee'};color:${received ? '#8a5a12' : '#226246'};">${escape(status.toUpperCase())}</span><h1 style="margin:18px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:37px;color:#57123f;">${escape(title)}</h1><p style="margin:0 0 10px;font-size:15px;line-height:25px;font-weight:bold;">${escape(greeting)}</p><p style="margin:0;font-size:14px;line-height:24px;color:#655a63;">${escape(intro)}</p></td></tr>
<tr><td style="padding:14px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #eee6ec;border-radius:10px;background:#fcfafb;">${rows}</table></td></tr>
<tr><td style="padding:10px 28px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:18px;border-left:4px solid ${received ? '#d5b38a' : '#39875f'};background:${received ? '#faf6f0' : '#f0f8f3'};border-radius:5px;"><h2 style="margin:0 0 10px;font-size:14px;color:#57123f;">${received ? 'Your issue' : 'Resolution from our team'}</h2><p style="margin:0;font-size:14px;line-height:24px;color:#453c43;word-break:break-word;">${paragraph(received ? ticket.description || '' : ticket.resolution || '')}</p></td></tr></table></td></tr>
<tr><td style="padding:4px 28px 26px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#57123f" style="border-radius:8px;"><a href="${escape(link)}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border:1px solid #57123f;border-radius:8px;">View your tickets &rarr;</a></td></tr></table><p style="margin:16px 0 0;font-size:12px;line-height:20px;color:#796b76;">${received ? 'Keep this email for your records. Quote your ticket reference whenever you contact us.' : 'Need more help? Reply to this email or contact our team, quoting your ticket reference.'}</p><p style="margin:22px 0 0;font-size:13px;line-height:22px;">Warm regards,<br><strong>Client Support Team</strong><br><span style="color:#57123f;">Zumar Law Firm</span></p></td></tr>
<tr><td style="padding:22px 28px;background:#faf6f9;border-top:1px solid #eee6ec;"><p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#57123f;">WE ARE HERE TO HELP</p><p style="margin:0;font-size:13px;line-height:23px;"><a href="tel:+92518445095" style="color:#57123f;text-decoration:none;">051-8445095</a><br><a href="mailto:team@zumarlawfirm.com" style="color:#57123f;">team@zumarlawfirm.com</a></p><p style="margin:14px 0 0;font-size:10px;line-height:17px;color:#8b7e87;">This email relates to your support ticket with Zumar Law Firm. Please keep your ticket details private.</p></td></tr>
</table><p style="margin:18px 0 0;font-size:10px;line-height:18px;color:#8b7e87;">Zumar Law Firm &middot; Client Support</p>
</td></tr></table></body></html>`;
  return { subject, text, html, replyTo: 'team@zumarlawfirm.com' };
}
