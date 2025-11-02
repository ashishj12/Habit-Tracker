import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

const redisOptions: {
  host: string;
  port: number;
  maxRetriesPerRequest: null;
  password?: string; // mark as truly optional
} = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('ready', () => logger.info('Redis ready'));
redisClient.on('error', (err: Error) => logger.error('Redis Client Error:', err));
