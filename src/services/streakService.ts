import { CONSTANTS } from '../config/constants.js';
import { prisma } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import { type FrequencyConfig, type StreakData } from '../types/index.js';
import {
  getTodayInTimezone,
  getYesterdayInTimezone,
  parseDateString,
  getDayOfWeek,
} from '../utils/dateHelpers.js';

import { subDays, format } from 'date-fns';

export class StreakService {
  async calculateStreak(habitId: string): Promise<StreakData> {
    // Check cache first
    const cacheKey = `streak:${habitId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        completions: {
          orderBy: { completedDate: 'desc' },
        },
        user: true,
      },
    });

    if (!habit) {
      throw new Error('Habit not found');
    }

    const today = getTodayInTimezone(habit.user.timezone);
    const completions = habit.completions.map((c) => c.completedDate);

    let currentStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: string | null = completions[0] || null;

    if (habit.frequencyType === 'DAILY') {
      currentStreak = this.calculateDailyStreak(completions, today);
      longestStreak = this.calculateLongestDailyStreak(completions);
    } else if (habit.frequencyType === 'WEEKLY') {
      const config = habit.frequencyConfig as FrequencyConfig;
      currentStreak = this.calculateWeeklyStreak(completions, today, config.target || 3);
      longestStreak = this.calculateLongestWeeklyStreak(completions, config.target || 3);
    } else if (habit.frequencyType === 'CUSTOM') {
      const config = habit.frequencyConfig as FrequencyConfig;
      currentStreak = this.calculateCustomStreak(completions, today, config.days || []);
      longestStreak = this.calculateLongestCustomStreak(completions, config.days || []);
    }

    const streakData: StreakData = {
      currentStreak,
      longestStreak,
      lastCompletedDate,
    };

    // Cache for 1 hour
    await redisClient.setEx(cacheKey, CONSTANTS.CACHE_TTL.STREAK, JSON.stringify(streakData));

    // Update database
    await prisma.streak.upsert({
      where: { habitId },
      update: { currentStreak, longestStreak, lastCompletedDate },
      create: { habitId, currentStreak, longestStreak, lastCompletedDate },
    });

    return streakData;
  }

  private calculateDailyStreak(completions: string[], today: string): number {
    if (completions.length === 0) return 0;

    let streak = 0;
    const todayDate = parseDateString(today);
    let checkDate = subDays(todayDate, 1); // Start from yesterday

    for (let i = 0; i < 365; i++) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');

      if (completions.includes(dateStr)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLongestDailyStreak(completions: string[]): number {
    if (completions.length === 0) return 0;

    const sorted = [...completions].sort();
    let longest = 1;
    let current = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = parseDateString(sorted[i - 1]);
      const currDate = parseDateString(sorted[i]);
      const diffDays = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }

    return longest;
  }

  private calculateWeeklyStreak(completions: string[], today: string, target: number): number {
    // Implementation for weekly streaks (simplified)
    // Count weeks where target is met
    return 0; // Placeholder
  }

  private calculateLongestWeeklyStreak(completions: string[], target: number): number {
    return 0; // Placeholder
  }

  private calculateCustomStreak(
    completions: string[],
    today: string,
    requiredDays: number[],
  ): number {
    if (completions.length === 0 || requiredDays.length === 0) return 0;

    let streak = 0;
    const todayDate = parseDateString(today);
    let checkDate = subDays(todayDate, 1);

    for (let i = 0; i < 365; i++) {
      const dayOfWeek = checkDate.getDay();

      if (requiredDays.includes(dayOfWeek)) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');

        if (completions.includes(dateStr)) {
          streak++;
        } else {
          break;
        }
      }

      checkDate = subDays(checkDate, 1);
    }

    return streak;
  }

  private calculateLongestCustomStreak(completions: string[], requiredDays: number[]): number {
    return 0; // Placeholder
  }

  async invalidateCache(habitId: string): Promise<void> {
    await redisClient.del(`streak:${habitId}`);
  }
}
