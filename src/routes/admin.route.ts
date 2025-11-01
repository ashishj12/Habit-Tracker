import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { StreakService } from '../services/streakService.js';
import { type AuthRequest } from '../types/index.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';

const router: Router = Router();
const streakService = new StreakService();

// Simple admin check (in production, use proper role-based auth)
const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
  if (!adminEmails.includes(req.user!.email)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};

router.use(authMiddleware);
router.use(adminMiddleware);

// Recalculate all streaks
router.post('/recalculate-streaks', async (req: AuthRequest, res: Response) => {
  try {
    const count = await streakService.recalculateAllStreaks();
    res.json({ message: `Recalculated ${count} streaks` });
  } catch (error) {
    logger.error('Admin recalculate streaks failed:', error);
    res.status(500).json({ error: 'Failed to recalculate streaks' });
  }
});

// Get system stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalHabits, totalCompletions] = await Promise.all([
      prisma.user.count(),
      prisma.habit.count({ where: { archived: false } }),
      prisma.completion.count(),
    ]);

    res.json({
      totalUsers,
      totalHabits,
      totalCompletions,
      averageHabitsPerUser: totalUsers > 0 ? totalHabits / totalUsers : 0,
    });
  } catch (error) {
    logger.error('Admin stats failed:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
