import { Injectable, Logger } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { MailerTemplateService } from './mailer-template.service';
import { getMailerTransporter } from './mailer.config';
import {
  SendMailOptions,
  BookingDetails,
  BookingCancelDetails,
  PaymentDetails,
  RefundDetails,
  BookingAlertDetails,
  TrekReminderDetails,
  CapacityWarningDetails,
  TrekPublishedDetails,
} from './interfaces/mailer.interface';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly fromEmail: string;
  private transporter: Transporter | null = null;

  constructor(private readonly templateService: MailerTemplateService) {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@offbeatpravasi.com';
    this.transporter = getMailerTransporter();
    if (!this.transporter) {
      this.logger.warn(
        'No mail transporter configured. Email sending will be disabled.',
      );
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email sending disabled. Would send to ${options.to}: ${options.subject}`,
      );
      return;
    }

    try {
      const html = this.templateService.render(
        options.template,
        options.context,
      );
      const msg: any = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        html,
      };
      if (options.attachments?.length) {
        msg.attachments = options.attachments;
      }

      await this.transporter.sendMail(msg);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email sending disabled. Would send to ${options.to}: ${options.subject}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
      );
      throw error;
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Your OTP for Offbeat Pravasi',
      template: 'auth/email-verification',
      context: { otp },
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Welcome to Offbeat Pravasi!',
      template: 'auth/welcome',
      context: { name },
    });
  }

  async sendPasswordResetEmail(email: string, otp: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Reset Your Password - Offbeat Pravasi',
      template: 'auth/password-reset',
      context: { otp },
    });
  }

  async sendPasswordResetSuccessEmail(
    email: string,
    name: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Password Changed Successfully - Offbeat Pravasi',
      template: 'auth/password-reset-success',
      context: { name },
    });
  }

  async sendBookingConfirmationEmail(
    email: string,
    details: BookingDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Booking Confirmed - ${details.trekName}`,
      template: 'bookings/booking-confirmation',
      context: details,
    });
  }

  async sendBookingCancellationEmail(
    email: string,
    details: BookingCancelDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Booking Cancelled - Offbeat Pravasi',
      template: 'bookings/booking-cancelled',
      context: details,
    });
  }

  async sendTicketEmail(
    email: string,
    details: BookingDetails,
    pdfBuffer?: Buffer,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Your Ticket - ${details.trekName}`,
      template: 'bookings/ticket-email',
      context: details,
      attachments: pdfBuffer
        ? [{ filename: 'ticket.pdf', content: pdfBuffer }]
        : undefined,
    });
  }

  async sendPaymentReceiptEmail(
    email: string,
    details: PaymentDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Payment Receipt - Offbeat Pravasi',
      template: 'bookings/payment-receipt',
      context: details,
    });
  }

  async sendRefundProcessedEmail(
    email: string,
    details: RefundDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Refund Processed - Offbeat Pravasi',
      template: 'bookings/refund-processed',
      context: details,
    });
  }

  async sendNewBookingAlertEmail(
    organizerEmail: string,
    details: BookingAlertDetails,
  ): Promise<void> {
    await this.sendMail({
      to: organizerEmail,
      subject: `New Booking - ${details.trekName}`,
      template: 'bookings/new-booking-alert',
      context: details,
    });
  }

  async sendTicketReissuedEmail(
    email: string,
    details: BookingDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Ticket Re-Issued - ${details.trekName}`,
      template: 'bookings/ticket-reissued',
      context: details,
    });
  }

  async sendOrganizerApplicationReceivedEmail(
    email: string,
    name: string,
    organizationName: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Application Received - Offbeat Pravasi',
      template: 'organizer/application-received',
      context: { name, organizationName },
    });
  }

  async sendOrganizerApprovedEmail(
    email: string,
    name: string,
    organizationName: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Organizer Application Approved - Offbeat Pravasi',
      template: 'organizer/organizer-approved',
      context: { name, organizationName },
    });
  }

  async sendOrganizerRejectedEmail(
    email: string,
    name: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Organizer Application Status - Offbeat Pravasi',
      template: 'organizer/organizer-rejected',
      context: { name, organizationName, reason },
    });
  }

  async sendOrganizerNeedsMoreInfoEmail(
    email: string,
    name: string,
    organizationName: string,
    message?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Additional Information Required - Offbeat Pravasi',
      template: 'organizer/organizer-needs-more-info',
      context: { name, organizationName, message },
    });
  }

  async sendTrekReminderEmail(
    email: string,
    details: TrekReminderDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Reminder: ${details.trekName} starts soon!`,
      template: 'treks/trek-reminder',
      context: details,
    });
  }

  async sendTrekCancelledEmail(
    email: string,
    name: string,
    trekName: string,
    reason?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Trek Cancelled - ${trekName}`,
      template: 'treks/trek-cancelled',
      context: { name, trekName, reason },
    });
  }

  async sendWaitlistPromotionEmail(
    email: string,
    name: string,
    trekName: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Spot Opened Up - ${trekName}`,
      template: 'treks/waitlist-promoted',
      context: { name, trekName },
    });
  }

  async sendTrekCapacityWarningEmail(
    organizerEmail: string,
    details: CapacityWarningDetails,
  ): Promise<void> {
    await this.sendMail({
      to: organizerEmail,
      subject: `Capacity Alert - ${details.trekName}`,
      template: 'treks/capacity-warning',
      context: details,
    });
  }

  async sendTrekPublishedEmail(
    email: string,
    details: TrekPublishedDetails,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Trek Published - ${details.trekName}`,
      template: 'treks/trek-published',
      context: details,
    });
  }

  async sendTrekRejectedEmail(
    email: string,
    name: string,
    trekName: string,
    reason?: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: `Trek Not Published - ${trekName}`,
      template: 'treks/trek-rejected',
      context: { name, trekName, reason },
    });
  }

  async sendEmailChangeVerificationEmail(
    email: string,
    name: string,
    newEmail: string,
    otp: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Email Change Verification - Offbeat Pravasi',
      template: 'system/email-change-verification',
      context: { name, newEmail, otp },
    });
  }

  async sendAccountDeletionConfirmationEmail(
    email: string,
    name: string,
  ): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Account Deleted - Offbeat Pravasi',
      template: 'system/account-deletion-confirmation',
      context: { name },
    });
  }
}
