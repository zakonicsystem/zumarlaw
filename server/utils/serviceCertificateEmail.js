import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEmailTransporter, getEmailFrom } from './emailTransporter.js';
import { buildCertificateEmail, getCertificateEmailLogoAttachment } from './certificateEmail.js';

const serverUploadsPath = fileURLToPath(new URL('../uploads/', import.meta.url));

export const isCompletedServiceStatus = (status) => (
  String(status || '').trim().toLowerCase() === 'completed'
);

const findCertificatePath = (filename) => {
  const candidates = [
    path.resolve(process.cwd(), 'uploads', filename),
    path.resolve(serverUploadsPath, filename),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

export const sendServiceCertificateEmail = async ({
  recipientEmail,
  recipientName,
  serviceName,
  certificateFilename,
}) => {
  const email = String(recipientEmail || '').trim();
  const certificate = String(certificateFilename || '').trim();

  if (!email) return { sent: false, reason: 'missing_email' };
  if (!certificate) return { sent: false, reason: 'missing_certificate' };

  const certificatePath = findCertificatePath(certificate);
  if (!certificatePath) return { sent: false, reason: 'certificate_file_not_found' };

  const transporter = createEmailTransporter();
  const emailContent = buildCertificateEmail({ recipientName, serviceName });
  let info;
  try {
    info = await transporter.sendMail({
      from: getEmailFrom(),
      to: email,
      ...emailContent,
      attachments: [
        { filename: certificate, path: certificatePath },
        getCertificateEmailLogoAttachment(),
      ],
    });
  } finally {
    transporter.close();
  }

  return {
    sent: true,
    messageId: info.messageId,
    sentAt: new Date(),
  };
};

export const autoSendCompletedServiceCertificate = async ({
  service,
  recipientEmail,
  recipientName,
  serviceName,
}) => {
  if (!service || !isCompletedServiceStatus(service.status)) {
    return { sent: false, reason: 'service_not_completed' };
  }
  if (service.certificateEmailSentAt) {
    return { sent: false, reason: 'already_sent', sentAt: service.certificateEmailSentAt };
  }

  const result = await sendServiceCertificateEmail({
    recipientEmail,
    recipientName,
    serviceName,
    certificateFilename: service.certificate,
  });

  if (result.sent) {
    service.certificateEmailSentAt = result.sentAt;
    await service.save();
  }

  return result;
};
