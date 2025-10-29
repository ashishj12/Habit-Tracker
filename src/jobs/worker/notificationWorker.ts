import { Worker } from 'bullmq';
import { redisClient } from '../../config/redis.js';
import { prisma } from '../../config/database.js';
import { type NotificationJobData } from '../queue/notificationQueue.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job) => {
    const { habitId, userEmail, habitName, notificationDate } = job.data;

    try {
      // Check if already sent
      const existing = await prisma.notificationLog.findUnique({
        where: {
          habitId_notificationDate: {
            habitId,
            notificationDate,
          },
        },
      });

      if (existing && existing.status === 'SENT') {
        console.log(`Notification already sent for habit ${habitId} on ${notificationDate}`);
        return { status: 'skipped', reason: 'already_sent' };
      }

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: userEmail,
        subject: `Reminder: ${habitName}`,
        html: `
          <h2>Time to work on your habit!</h2>
          <p>Don't forget to complete: <strong>${habitName}</strong></p>
          <p>Keep your streak going! 🔥</p>
        `,
      });

      // Log notification
      await prisma.notificationLog.upsert({
        where: {
          habitId_notificationDate: {
            habitId,
            notificationDate,
          },
        },
        update: {
          status: 'SENT',
          sentAt: new Date(),
        },
        create: {
          habitId,
          notificationDate,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      console.log(`Notification sent for habit ${habitId}`);
      return { status: 'sent' };
    } catch (error: any) {
      console.error('Failed to send notification:', error);

      await prisma.notificationLog.upsert({
        where: {
          habitId_notificationDate: {
            habitId,
            notificationDate,
          },
        },
        update: {
          status: 'FAILED',
          errorMessage: error.message,
        },
        create: {
          habitId,
          notificationDate,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000,
    },
  }
);