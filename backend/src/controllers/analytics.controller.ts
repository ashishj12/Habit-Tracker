import { type Response, type NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { type AuthRequest } from '../types/index.js';

const analyticsService = new AnalyticsService();
export class AnalyticsController {
  async getUserStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await analyticsService.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getHabitAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ error: 'Habit id is required' });
      }
      const analytics = await analyticsService.getHabitAnalytics(habitId, userId);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
}
