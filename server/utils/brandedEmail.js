import { fileURLToPath } from 'url';

export const EMAIL_LOGO_CID = 'zumar-law-firm-logo';
const LOGO_PATH = fileURLToPath(new URL('../../client/src/assets/ZumarLogo.png', import.meta.url));

export const EMAIL_DISCLAIMER = `The Zumar Law Firm, as a matter of policy, disclaims responsibility for any private publication or statement by any of its employees. The views expressed herein are those of the sender and do not necessarily reflect the views of the Company, the Company, or other members of the Company staff. This message (and any associated files) is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential, or subject to copyright. If you are not the intended recipient you are hereby notified that any dissemination, copying or distribution of this message, or files associated with this message, is strictly prohibited. If you have received this message in error, please accept Company apologies and notify us immediately by replying to the message and deleting it from your computer. Messages sent to and from us may be monitored to maintain necessary service and security standards. Internet communications cannot be guaranteed to be secured or error-free as information could be intercepted, corrupted, lost, destroyed, arrive late or incomplete, or contain viruses. Therefore, we do not accept responsibility for any errors or omissions that are present in this message, or any attachment, that have arisen as a result of Email transmission. If verification is required, please request a hard-copy version.`;

export const EMAIL_VIRUS_WARNING = `The recipient should check this Email and any attachment for the presence of viruses. Although the Company has taken reasonable precautions to ensure no viruses are present in this Email, the Company does not accept responsibility for any loss or damage arising from the use of this Email or any attachments(s).`;

export const escapeEmailHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const getBrandedEmailLogoAttachment = () => ({
  filename: 'ZumarLogo.png',
  path: LOGO_PATH,
  cid: EMAIL_LOGO_CID,
  contentDisposition: 'inline',
});

export const buildBrandedEmail = ({
  subject,
  title,
  preheader,
  greeting = 'Dear Client,',
  contentHtml,
  contentText,
  signatureTitle = 'Client Support Officer',
}) => {
  const safeSubject = escapeEmailHtml(subject);
  const safeTitle = escapeEmailHtml(title);
  const safePreheader = escapeEmailHtml(preheader || subject);
  const safeGreeting = escapeEmailHtml(greeting);

  const text = `${greeting}

${contentText}

Sincerely,

Zumar Law Firm
${signatureTitle}

A TRUE PRACTICE MANAGEMENT FIRM
Office No 8B 5th Floor Rizwan Arcade
Adam Jee Road Sadar Rawalpindi
Tel : 051-8445595 | 042-37242555
Email: team@zumarlawfirm.com
Web: https://zumarlawfirm.com/
Public Portal: https://app.zumarlawfirm.com/signup

DISCLAIMER: ${EMAIL_DISCLAIMER}

WARNING: ${EMAIL_VIRUS_WARNING}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeSubject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f5f7; color:#1f2933; font-family:Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${safePreheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f3f5f7;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:640px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(15,23,42,0.08);">
          <tr>
            <td style="height:6px; background-color:#57123f; font-size:0; line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:25px 36px 21px; background-color:#57123f; text-align:center;">
              <img src="cid:${EMAIL_LOGO_CID}" width="380" alt="Zumar Law Firm" style="display:block; width:100%; max-width:380px; height:auto; margin:0 auto; border:0; outline:none; text-decoration:none;">
              <div style="margin-top:12px; font-size:11px; line-height:16px; font-weight:bold; letter-spacing:2px; color:#f2dfc3;">A TRUE PRACTICE MANAGEMENT FIRM</div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 40px 32px;">
              <h1 style="margin:0 0 24px; font-size:24px; line-height:32px; font-family:Georgia, 'Times New Roman', serif; color:#57123f;">${safeTitle}</h1>
              <p style="margin:0 0 20px; font-size:16px; line-height:26px; color:#263442;">${safeGreeting}</p>
              ${contentHtml}
              <p style="margin:26px 0 0; font-size:15px; line-height:24px; color:#263442;"><strong>Sincerely,</strong><br><span style="display:inline-block; margin-top:7px;"><strong>Zumar Law Firm</strong><br>${escapeEmailHtml(signatureTitle)}</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 40px; background-color:#f7f9fb; border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 10px; font-size:13px; line-height:20px; font-weight:bold; color:#57123f;">Zumar Law Firm</p>
              <p style="margin:0; font-size:12px; line-height:20px; color:#52606d;">Office No 8B 5th Floor Rizwan Arcade<br>Adam Jee Road Sadar Rawalpindi<br>Tel : <a href="tel:+92518445595" style="color:#52606d; text-decoration:none;">051-8445595</a> &nbsp;|&nbsp; <a href="tel:+924237242555" style="color:#52606d; text-decoration:none;">042-37242555</a><br>Email: <a href="mailto:team@zumarlawfirm.com" style="color:#57123f;">team@zumarlawfirm.com</a></p>
              <p style="margin:12px 0 0; font-size:12px; line-height:20px;"><a href="https://zumarlawfirm.com/" style="color:#57123f; font-weight:bold;">Visit our website</a> &nbsp;|&nbsp; <a href="https://app.zumarlawfirm.com/signup" style="color:#57123f; font-weight:bold;">Open public portal</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px; background-color:#eef2f5; border-top:1px solid #dce3e8;">
              <p style="margin:0 0 7px; font-size:10px; line-height:16px; font-weight:bold; color:#52606d; text-transform:uppercase; letter-spacing:0.5px;">Disclaimer</p>
              <p style="margin:0; font-size:9px; line-height:15px; text-align:justify; color:#6b7785;">${escapeEmailHtml(EMAIL_DISCLAIMER)}</p>
              <p style="margin:13px 0 7px; font-size:10px; line-height:16px; font-weight:bold; color:#52606d; text-transform:uppercase; letter-spacing:0.5px;">Warning</p>
              <p style="margin:0; font-size:9px; line-height:15px; text-align:justify; color:#6b7785;">${escapeEmailHtml(EMAIL_VIRUS_WARNING)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};
