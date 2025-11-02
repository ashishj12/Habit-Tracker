import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { prisma } from './config/database.js';
import { redisClient } from './config/redis.js';
import { startReminderScheduler } from './jobs/scheduler/reminderScheduler.js';
import { startReportScheduler } from './jobs/scheduler/reportScheduler.js';
import { notificationWorker } from './jobs/worker/notificationWorker.js';
import { reportWorker } from './jobs/worker/reportWorker.js';
import { logger } from './config/logger.js';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3000;

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

async function startServer() {
  try {
    // Connect to Redis
    logger.info('Redis connected');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Start background workers
    logger.info('Notification worker started');
    logger.info('Report worker started');

    // Start schedulers
    startReminderScheduler();
    startReportScheduler();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Documentation: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  try {
    await notificationWorker.close();
    await reportWorker.close();
    await prisma.$disconnect();
    await redisClient.quit();
    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
