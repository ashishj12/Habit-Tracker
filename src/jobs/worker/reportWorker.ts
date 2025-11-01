import { Worker } from 'bullmq';
import { redisClient } from '../../config/redis.js';
import { type ReportJobData } from '../queue/reportQueue.js';
import { ReportService } from '../../services/reportService.js';
import { logger } from '../../config/logger.js';

const reportService = new ReportService();

export const reportWorker = new Worker<ReportJobData>(
  'reports',
  async (job) => {
    const { userId, reportType } = job.data;

    try {
      if (reportType === 'weekly') {
        await reportService.generateWeeklyReport(userId);
      } else if (reportType === 'monthly') {
        await reportService.generateMonthlyReport(userId);
      }

      logger.info(`${reportType} report generated for user ${userId}`);
      return { status: 'success' };
    } catch (error) {
      logger.error(`Failed to generate ${reportType} report for user ${userId}:`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 3,
  },
);
