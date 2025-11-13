import { Worker } from 'bullmq';

const host = process.env.REDIS_HOST ?? '127.0.0.1';
const port = Number(process.env.REDIS_PORT ?? 6379);
const password = process.env.REDIS_PASSWORD;

export const notificationWorker = new Worker(
  'notification-queue',
  async (job) => {
    // TODO:job.data is typed as unknown, so define your own type:
    interface NotificationJob {
      userId: string;
      title: string;
      body: string;
    }

    const data = job.data as NotificationJob;

    // TODO: integrate FCM sending here
  },
  {
    connection: {
      host,
      port,
      password,
    },
  },
);
