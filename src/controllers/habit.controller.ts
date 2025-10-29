import { type Response, type NextFunction } from 'express';
import { HabitService } from '../services/habitService.js';
import { type AuthRequest } from '../types/index.js';

const habitService = new HabitService();
export class HabitController {
  async createHabit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habit = await habitService.createHabit(userId, req.body);
      res.status(201).json(habit);
    } catch (error) {
      next(error);
    }
  }

  async getUserHabits(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habits = await habitService.getUserHabits(userId);
      res.json(habits);
    } catch (error) {
      next(error);
    }
  }

  async getHabit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ message: 'Habit id is required' });
      }
      const habit = await habitService.getHabit(habitId, userId);
      res.json(habit);
    } catch (error) {
      next(error);
    }
  }

  async updateHabit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ message: 'Habit id is required' });
      }
      const habit = await habitService.updateHabit(habitId, userId, req.body);
      res.json(habit);
    } catch (error) {
      next(error);
    }
  }

  async deleteHabit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ message: 'Habit id is required' });
      }
      const result = await habitService.deleteHabit(habitId, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async completeHabit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ message: 'Habit id is required' });
      }
      const { completedDate, notes } = req.body;
      const completion = await habitService.completeHabit(habitId, userId, completedDate, notes);
      res.status(201).json(completion);
    } catch (error) {
      next(error);
    }
  }

  async uncompleteHabit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ message: 'Habit id is required' });
      }
      const { completedDate } = req.body;
      const result = await habitService.uncompleteHabit(habitId, userId, completedDate);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getHabitHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const habitId = req.params.id;
      if (!habitId) {
        return res.status(400).json({ message: 'Habit id is required' });
      }
      const limit = parseInt(req.query.limit as string) || 30;
      const history = await habitService.getHabitHistory(habitId, userId, limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}
