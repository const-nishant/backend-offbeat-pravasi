import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';

let transporter: Transporter | null = null;

export function getMailerTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  if (apiKey) {
    transporter = createTransport({
      host: 'smtp.sendgrid.net',
      port: 465,
      secure: true,
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });
  } else if (smtpHost) {
    transporter = createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASSWORD ?? '',
      },
    });
  }

  return transporter;
}

export function resetMailerTransporter(): void {
  transporter = null;
}
