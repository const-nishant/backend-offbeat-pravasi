import type { Attachment } from 'nodemailer/lib/mailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: Attachment[];
}

export interface BookingDetails {
  name: string;
  trekName: string;
  bookingId: string;
  amount: number;
  startDate: string;
  quantity?: number;
  location?: string;
}

export interface BookingCancelDetails {
  name: string;
  trekName: string;
  bookingId: string;
  refundInfo?: string;
}

export interface PaymentDetails {
  name: string;
  trekName?: string;
  bookingId: string;
  amount: number;
  paymentId: string;
  paymentDate: string;
}

export interface RefundDetails {
  name: string;
  trekName?: string;
  bookingId: string;
  refundAmount: number;
}

export interface BookingAlertDetails {
  organizerName: string;
  trekName: string;
  bookingId: string;
  customerName: string;
  quantity: number;
  totalAmount: number;
}

export interface TrekReminderDetails {
  name: string;
  trekName: string;
  startDate: string;
  location?: string;
}

export interface CapacityWarningDetails {
  organizerName: string;
  trekName: string;
  currentBookings: number;
  maxCapacity: number;
}

export interface TrekPublishedDetails {
  name: string;
  trekName: string;
  trekUrl?: string;
}
