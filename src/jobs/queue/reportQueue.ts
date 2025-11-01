import { Queue } from 'bullmq';
import { redisClient } from '../../config/redis.js';

export const reportQueue = new Queue('reports', {
  connection: redisClient,
});

export interface ReportJobData {
  userId: string;
  reportType: 'weekly' | 'monthly';
}