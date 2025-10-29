import { Queue } from 'bullmq';
import { redisClient } from '../../config/redis.js';

export const notificationQueue = new Queue('notifications', {
  connection: redisClient,
});

export interface NotificationJobData {
  habitId: string;
  userId: string;
  userEmail: string;
  habitName: string;
  notificationDate: string;
}