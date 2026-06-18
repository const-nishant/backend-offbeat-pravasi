import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '@sendgrid/mail';

const sgMail = new MailService();

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'SENDGRID_API_KEY not set. Email sending will be disabled.',
      );
    } else {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid initialized successfully');
    }

    this.fromEmail = process.env.EMAIL_FROM || 'noreply@offbeatpravasi.com';
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      this.logger.warn(
        `Email sending disabled. Would send to ${options.to}: ${options.subject}`,
      );
      return;
    }

    try {
      const msg = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        text: options.text || this.stripHtml(options.html),
        html: options.html,
      };

      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const subject = 'Your OTP for Offbeat Pravasi';
    const html = this.getOtpEmailTemplate(otp);
    const text = `Your OTP code is: ${otp}. This code will expire in 10 minutes.`;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private getOtpEmailTemplate(otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 20px; text-align: center; background-color: #4CAF50; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Offbeat Pravasi</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Email Verification</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Thank you for registering with Offbeat Pravasi! Please use the following OTP code to verify your email address:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 20px 40px; background-color: #f0f0f0; border-radius: 8px; border: 2px dashed #4CAF50;">
                  <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">${otp}</span>
                </div>
              </div>
              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
              </p>
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = 'Welcome to Offbeat Pravasi!';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:20px 0;text-align:center;">
      <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 20px;text-align:center;background-color:#4CAF50;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;">Offbeat Pravasi</h1>
        </td></tr>
        <tr><td style="padding:40px 20px;">
          <h2 style="margin:0 0 20px 0;color:#333333;font-size:24px;">Welcome, ${name}!</h2>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Your email has been verified successfully. You are now ready to explore the great outdoors with Offbeat Pravasi!
          </p>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Start discovering amazing treks, connect with fellow trekkers, and book your next adventure.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#999999;font-size:12px;">
            © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    await this.sendEmail({ to: email, subject, html });
  }

  async sendBookingConfirmationEmail(
    email: string,
    name: string,
    trekName: string,
    bookingId: string,
    amount: number,
    startDate: string,
  ): Promise<void> {
    const subject = 'Booking Confirmed - Offbeat Pravasi';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:20px 0;text-align:center;">
      <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 20px;text-align:center;background-color:#2196F3;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;">Booking Confirmed!</h1>
        </td></tr>
        <tr><td style="padding:40px 20px;">
          <h2 style="margin:0 0 20px 0;color:#333333;">Hi ${name},</h2>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Your booking for <strong>${trekName}</strong> has been confirmed.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:10px;border:1px solid #ddd;color:#666;">Booking ID</td>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${bookingId}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;color:#666;">Trek</td>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${trekName}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;color:#666;">Start Date</td>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">${startDate}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;color:#666;">Amount Paid</td>
                <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">₹${amount}</td></tr>
          </table>
          <p style="margin:20px 0 0 0;color:#666666;font-size:14px;">
            Your ticket PDF has been attached to this email. Please keep it for check-in.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#999999;font-size:12px;">
            © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    await this.sendEmail({ to: email, subject, html });
  }

  async sendBookingCancellationEmail(
    email: string,
    name: string,
    trekName: string,
    bookingId: string,
  ): Promise<void> {
    const subject = 'Booking Cancelled - Offbeat Pravasi';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:20px 0;text-align:center;">
      <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 20px;text-align:center;background-color:#f44336;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;">Booking Cancelled</h1>
        </td></tr>
        <tr><td style="padding:40px 20px;">
          <h2 style="margin:0 0 20px 0;color:#333333;">Hi ${name},</h2>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Your booking for <strong>${trekName}</strong> (ID: ${bookingId}) has been cancelled.
          </p>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            If a refund is applicable, it will be processed according to our cancellation policy.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#999999;font-size:12px;">
            © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    await this.sendEmail({ to: email, subject, html });
  }

  async sendPasswordResetEmail(email: string, otp: string): Promise<void> {
    const subject = 'Reset Your Password - Offbeat Pravasi';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:20px 0;text-align:center;">
      <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 20px;text-align:center;background-color:#FF9800;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;">Password Reset</h1>
        </td></tr>
        <tr><td style="padding:40px 20px;">
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            You requested a password reset. Use the OTP below to reset your password:
          </p>
          <div style="text-align:center;margin:30px 0;">
            <div style="display:inline-block;padding:20px 40px;background-color:#f0f0f0;border-radius:8px;border:2px dashed #FF9800;">
              <span style="font-size:32px;font-weight:bold;color:#FF9800;letter-spacing:5px;">${otp}</span>
            </div>
          </div>
          <p style="margin:20px 0 0 0;color:#999999;font-size:14px;">
            This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#999999;font-size:12px;">
            © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    await this.sendEmail({ to: email, subject, html });
  }

  async sendOrganizerApprovalEmail(
    email: string,
    name: string,
    organizationName: string,
  ): Promise<void> {
    const subject = 'Organizer Application Approved - Offbeat Pravasi';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Approved</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:20px 0;text-align:center;">
      <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 20px;text-align:center;background-color:#4CAF50;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;">Congratulations!</h1>
        </td></tr>
        <tr><td style="padding:40px 20px;">
          <h2 style="margin:0 0 20px 0;color:#333333;">Hi ${name},</h2>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Your organizer application for <strong>${organizationName}</strong> has been approved!
          </p>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            You can now create and manage treks, view bookings, and access the organizer dashboard.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#999999;font-size:12px;">
            © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    await this.sendEmail({ to: email, subject, html });
  }

  async sendOrganizerRejectionEmail(
    email: string,
    name: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    const subject = 'Organizer Application Status - Offbeat Pravasi';
    const reasonHtml = reason
      ? `<p style="margin:20px 0 0 0;color:#666666;font-size:16px;line-height:1.5;">Reason: ${reason}</p>`
      : '';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:20px 0;text-align:center;">
      <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px 20px;text-align:center;background-color:#f44336;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;">Application Update</h1>
        </td></tr>
        <tr><td style="padding:40px 20px;">
          <h2 style="margin:0 0 20px 0;color:#333333;">Hi ${name},</h2>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Thank you for your interest in becoming an organizer for <strong>${organizationName}</strong>.
          </p>
          <p style="margin:0 0 20px 0;color:#666666;font-size:16px;line-height:1.5;">
            Unfortunately, your application could not be approved at this time.
          </p>
          ${reasonHtml}
          <p style="margin:20px 0 0 0;color:#666666;font-size:14px;">
            You are welcome to reapply after addressing the above concerns.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
          <p style="margin:0;color:#999999;font-size:12px;">
            © ${new Date().getFullYear()} Offbeat Pravasi. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
    await this.sendEmail({ to: email, subject, html });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
