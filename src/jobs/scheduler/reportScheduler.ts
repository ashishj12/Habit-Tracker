import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { reportQueue } from '../queue/reportQueue.js';
import { logger } from '../../config/logger.js';

export const startReportScheduler = () => {
  // Weekly reports - Every Sunday at 8 AM
  cron.schedule('0 8 * * 0', async () => {
    logger.info('Running weekly report scheduler...');

    try {
      const users = await prisma.user.findMany({
        where: {
          habits: {
            some: {
              archived: false,
            },
          },
        },
        select: { id: true },
      });

      for (const user of users) {
        await reportQueue.add(
          'weekly-report',
          {
            userId: user.id,
            reportType: 'weekly',
          },
          {
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );
      }

      logger.info(`Queued weekly reports for ${users.length} users`);
    } catch (error) {
      logger.error('Error in weekly report scheduler:', error);
    }
  });

  // Monthly reports - First day of month at 9 AM
  cron.schedule('0 9 1 * *', async () => {
    logger.info('Running monthly report scheduler...');

    try {
      const users = await prisma.user.findMany({
        where: {
          habits: {
            some: {
              archived: false,
            },
          },
        },
        select: { id: true },
      });

      for (const user of users) {
        await reportQueue.add(
          'monthly-report',
          {
            userId: user.id,
            reportType: 'monthly',
          },
          {
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );
      }

      logger.info(`Queued monthly reports for ${users.length} users`);
    } catch (error) {
      logger.error('Error in monthly report scheduler:', error);
    }
  });

  logger.info('Report schedulers started');
};