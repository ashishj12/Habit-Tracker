import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { StreakService } from './streakService.js';
import { getDayRangeInTimezone, getTodayInTimezone } from '../utils/dateHelpers.js';
import { type FrequencyConfig } from '../types/index.js';
import { subDays } from 'date-fns';

const streakService = new StreakService();
export class HabitService {
  async createHabit(userId: string, data: any) {
    const habit = await prisma.habit.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        frequencyType: data.frequencyType,
        frequencyConfig: data.frequencyConfig,
        reminderEnable: data.reminderEnabled || false,
        reminderTime: data.reminderTime,
        color: data.color || '#3B82F6',
        icon: data.icon || '⭐',
      },
    });

    // Initialize streak
    await prisma.streak.create({
      data: {
        habitId: habit.id,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    return habit;
  }

  async getUserHabits(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    const { start, end } = getDayRangeInTimezone(user.timezone);

    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      include: {
        streak: true,
        completions: {
          where: { completedDate: { gte: start, lte: end } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      frequencyType: habit.frequencyType,
      frequencyConfig: habit.frequencyConfig,
      reminderEnabled: habit.reminderEnable,
      reminderTime: habit.reminderTime,
      color: habit.color,
      icon: habit.icon,
      currentStreak: habit.streak?.currentStreak || 0,
      longestStreak: habit.streak?.longestStreak || 0,
      completedToday: habit.completions.length > 0,
      createdAt: habit.createdAt,
    }));
  }

  async getHabit(habitId: string, userId: string) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: { streak: true },
    });

    if (!habit) {
      throw new AppError(404, 'Habit not found');
    }

    return habit;
  }

  async updateHabit(habitId: string, userId: string, data: any) {
    const habit = await this.getHabit(habitId, userId);

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: {
        name: data.name ?? habit.name,
        description: data.description ?? habit.description,
        frequencyType: data.frequencyType ?? habit.frequencyType,
        frequencyConfig: data.frequencyConfig ?? habit.frequencyConfig,
        reminderEnable: data.reminderEnabled ?? habit.reminderEnable,
        reminderTime: data.reminderTime ?? habit.reminderTime,
        color: data.color ?? habit.color,
        icon: data.icon ?? habit.icon,
      },
    });

    // Recalculate streak if frequency changed
    if (data.frequencyType || data.frequencyConfig) {
      await streakService.invalidateCache(habitId);
      await streakService.calculateStreak(habitId);
    }

    return updated;
  }

  async deleteHabit(habitId: string, userId: string) {
    await this.getHabit(habitId, userId);

    await prisma.habit.deleteMany({
      where: {
        archived: true,
      },
    });

    return { message: 'Habit archived successfully' };
  }

  async completeHabit(habitId: string, userId: string, completedDate?: string, notes?: string) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: { user: true },
    });

    if (!habit) {
      throw new AppError(404, 'Habit not found');
    }

    const dateToComplete = completedDate || getTodayInTimezone(habit.user.timezone);

    try {
      const completion = await prisma.completion.create({
        data: {
          habitId,
          completedDate: dateToComplete,
          notes: notes ?? null,
        },
      });

      // Recalculate streak
      await streakService.invalidateCache(habitId);
      await streakService.calculateStreak(habitId);

      return completion;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError(400, 'Habit already completed for this date');
      }
      throw error;
    }
  }

  async uncompleteHabit(habitId: string, userId: string, completedDate: string) {
    const habit = await this.getHabit(habitId, userId);
    console.log('habt', habit);
    if (!habit) {
      throw new Error('Habit not found for this user');
    }

    await prisma.completion.deleteMany({
      where: {
        habitId,
        completedDate: new Date(completedDate),
      },
    });

    // Recalculate streak
    await streakService.invalidateCache(habitId);
    await streakService.calculateStreak(habitId);

    return { message: 'Completion removed successfully' };
  }

  async getHabitHistory(habitId: string, userId: string, limit = 30) {
    await this.getHabit(habitId, userId);

    const completions = await prisma.completion.findMany({
      where: { habitId },
      orderBy: { completedDate: 'desc' },
      take: limit,
    });

    return completions;
  }
}
