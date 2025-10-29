import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { prisma } from './config/database.js';
import { redisClient } from './config/redis.js';
import { startReminderScheduler } from './jobs/scheduler/reminderScheduler.js';
import { notificationWorker } from './jobs/worker/notificationWorker.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('Redis connected');

    // Test database connection
    await prisma.$connect();
    console.log('Database connected');

    // Start notification worker
    console.log('Notification worker started');

    // Start reminder scheduler
    startReminderScheduler();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  await redisClient.quit();
  await notificationWorker.close();
  process.exit(0);
});

startServer();
