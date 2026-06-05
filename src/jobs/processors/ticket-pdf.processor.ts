import type { Job } from 'bullmq';
import { Worker, Queue } from 'bullmq';
import { redisConfig } from '../../config/redis.config';
import { DataSource } from 'typeorm';
import { ormConfig } from '../../config/ormconfig';
const PDFDocument = require('pdfkit');
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const dataSource = new DataSource({ ...ormConfig, synchronize: false });

const s3Client = new S3Client({
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

export const ticketPdfWorker = new Worker(
  'ticket-pdf-queue',
  async (job: Job<{ bookingId: string }>) => {
    const { bookingId } = job.data;
    if (!dataSource.isInitialized) await dataSource.initialize();

    // load booking data
    const bookings = await dataSource.query(
      'SELECT id, user_id, trek_snapshot, quantity, total_amount_inr, metadata FROM bookings WHERE id = $1',
      [bookingId],
    );
    if (!bookings || !bookings.length) throw new Error('Booking not found');
    const booking = bookings[0];

    // generate PDF in memory
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

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

    // upload to R2 (S3 API)
    const bucket =
      process.env.R2_BUCKET_TREKS ||
      process.env.R2_BUCKET_POSTS ||
      process.env.R2_BUCKET_PROFILE ||
      'offbeat-treks-dev';
    const key = `tickets/${bookingId}.pdf`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }),
    );

    const pdfUrl = `${process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''}/${key}`;

    await dataSource.query(
      `
      UPDATE bookings SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{pdfUrl}', to_jsonb($1::text), true), updated_at = now() WHERE id = $2
    `,
      [pdfUrl, bookingId],
    );

    return { bookingId, pdfUrl };
  },
  {
    connection: {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
    },
  },
);

// Also expose a small helper queue producer for scheduling jobs programmatically
export const ticketPdfQueue = new Queue('ticket-pdf-queue', {
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
  },
});
