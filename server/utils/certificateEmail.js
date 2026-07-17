import {
  EMAIL_DISCLAIMER,
  EMAIL_LOGO_CID,
  EMAIL_VIRUS_WARNING,
  escapeEmailHtml,
  getBrandedEmailLogoAttachment,
} from './brandedEmail.js';

const COMPANY_NAME = 'Zumar Law Firm';

const normalizeValue = (value, fallback) => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const DISCLAIMER = EMAIL_DISCLAIMER;
const VIRUS_WARNING = EMAIL_VIRUS_WARNING;
const LOGO_CID = EMAIL_LOGO_CID;
const escapeHtml = escapeEmailHtml;

export const getCertificateEmailLogoAttachment = getBrandedEmailLogoAttachment;

export const buildCertificateEmail = ({ recipientName, serviceName } = {}) => {
  const name = normalizeValue(recipientName, 'Valued Client');
  const service = normalizeValue(serviceName, 'Requested Service');
  const safeName = escapeHtml(name);
  const safeService = escapeHtml(service);

  const text = `Dear ${name},

Please find attached your certificate for the service: ${service}.

Sincerely,

Zumar Law Firm
Client Support Officer

A TRUE PRACTICE MANAGEMENT FIRM
Office No 8B 5th Floor Rizwan Arcade
Adam Jee Road Sadar Rawalpindi
Tel : 051-8445595 | 042-37242555
Email: team@zumarlawfirm.com
Web: https://zumarlawfirm.com/
Public Portal: https://app.zumarlawfirm.com/signup

DISCLAIMER: ${DISCLAIMER}

WARNING: ${VIRUS_WARNING}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Certificate for ${safeService}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f5f7; color:#1f2933; font-family:Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">Your certificate for ${safeService} is attached.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f3f5f7;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:640px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(15,23,42,0.08);">
          <tr>
            <td style="height:6px; background-color:#57123f; font-size:0; line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:25px 36px 21px; background-color:#57123f; text-align:center;">
              <img src="cid:${LOGO_CID}" width="380" alt="Zumar Law Firm" style="display:block; width:100%; max-width:380px; height:auto; margin:0 auto; border:0; outline:none; text-decoration:none;">
              <div style="margin-top:12px; font-size:11px; line-height:16px; font-weight:bold; letter-spacing:2px; color:#f2dfc3;">A TRUE PRACTICE MANAGEMENT FIRM</div>
            </td>
          </tr>
          <tr>
            <td style="padding:38px 40px 32px;">
              <p style="margin:0 0 22px; font-size:16px; line-height:26px; color:#263442;">Dear <strong style="color:#57123f;">${safeName}</strong>,</p>
              <p style="margin:0 0 24px; font-size:16px; line-height:27px; color:#263442;">Please find attached your certificate for the service:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding:17px 20px; background-color:#fbf5f9; border-left:4px solid #57123f; border-radius:4px; font-size:16px; line-height:24px; font-weight:bold; color:#57123f;">${safeService}</td>
                </tr>
              </table>
              <p style="margin:0; font-size:15px; line-height:24px; color:#263442;"><strong>Sincerely,</strong></p>
              <p style="margin:8px 0 0; font-size:15px; line-height:23px; color:#263442;"><strong>${COMPANY_NAME}</strong><br>Client Support Officer</p>
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
              <p style="margin:0; font-size:9px; line-height:15px; text-align:justify; color:#6b7785;">${escapeHtml(DISCLAIMER)}</p>
              <p style="margin:13px 0 7px; font-size:10px; line-height:16px; font-weight:bold; color:#52606d; text-transform:uppercase; letter-spacing:0.5px;">Warning</p>
              <p style="margin:0; font-size:9px; line-height:15px; text-align:justify; color:#6b7785;">${escapeHtml(VIRUS_WARNING)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Your Certificate for ${service}`,
    text,
    html,
  };
};
