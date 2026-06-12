import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import PDFDocument from 'pdfkit';
import { bullConnection } from '../config';

export const TICKET_PDF_QUEUE = 'TICKET_PDF_QUEUE';

@Injectable()
export class TicketPdfWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TicketPdfWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('ticket-pdf-queue', {
    connection: bullConnection,
  });

  private readonly s3Client = new S3Client({
    region: process.env.R2_REGION ?? 'auto',
    endpoint:
      process.env.R2_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'ticket-pdf-queue',
      async (job) => {
        const { bookingId } = job.data as { bookingId: string };

        const bookings = await this.dataSource.query(
          'SELECT id, user_id, trek_snapshot, quantity, total_amount_inr, metadata FROM bookings WHERE id = $1',
          [bookingId],
        );
        if (!bookings || !bookings.length) throw new Error('Booking not found');
        const booking = bookings[0];

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));

        const trek = booking.trek_snapshot || {};
        doc.fontSize(20).text('Offbeat Pravasi - Ticket', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Booking ID: ${booking.id}`);
        doc.text(`User ID: ${booking.user_id}`);
        doc.text(`Trek: ${trek.name ?? 'N/A'}`);
        doc.text(`Quantity: ${booking.quantity}`);
        doc.text(`Total (INR): ${booking.total_amount_inr}`);
        doc.moveDown();
        doc.text('Enjoy your trek!', { align: 'center' });
        doc.end();

        await new Promise<void>((resolve, reject) => {
          doc.on('end', resolve);
          doc.on('error', reject);
        });

        const pdfBuffer = Buffer.concat(buffers);

        const bucket =
          process.env.R2_BUCKET_TREKS ||
          process.env.R2_BUCKET_POSTS ||
          process.env.R2_BUCKET_PROFILE ||
          'offbeat-treks-dev';
        const key = `tickets/${bookingId}.pdf`;

        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          }),
        );

        const pdfUrl = `${process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''}/${key}`;

        await this.dataSource.query(
          `UPDATE bookings SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{pdfUrl}', to_jsonb($1::text), true), updated_at = now() WHERE id = $2`,
          [pdfUrl, bookingId],
        );

        return { bookingId, pdfUrl };
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Ticket PDF job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Ticket PDF job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Ticket PDF worker started');
  }

  async enqueuePdfJob(bookingId: string) {
    const job = await this.queue.add('generate-pdf', { bookingId });
    return { enqueued: true, jobId: job.id };
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
