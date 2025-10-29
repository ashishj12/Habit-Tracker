export const CONSTANTS = {
  JWT_SECRET: process.env.JWT_SECRET || 'mysecretkey',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: 10,
  CACHE_TTL: {
    STREAK: 3600, // 1 hour
    USER_HABITS: 900, // 15 minutes
    DAILY_COMPLETION: 86400, // 24 hours
  },
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};
