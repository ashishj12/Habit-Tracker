import { prisma } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import { CONSTANTS } from '../config/constants.js';
import { getTodayInTimezone, parseDateString } from '../utils/dateHelpers.js';
import { type FrequencyConfig, type StreakData } from '../types/index.js';
import { subDays, startOfWeek, endOfWeek, format, differenceInDays } from 'date-fns';
import { logger } from '../config/logger.js';

export class StreakService {
  async calculateStreak(habitId: string): Promise<StreakData> {
    const cacheKey = `streak:${habitId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug(`Streak cache hit for habit ${habitId}`);
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

    await redisClient.setEx(cacheKey, CONSTANTS.CACHE_TTL.STREAK, JSON.stringify(streakData));
    await prisma.streak.upsert({
      where: { habitId },
      update: { currentStreak, longestStreak, lastCompletedDate },
      create: { habitId, currentStreak, longestStreak, lastCompletedDate },
    });

    logger.info(
      `Streak calculated for habit ${habitId}: current=${currentStreak}, longest=${longestStreak}`,
    );
    return streakData;
  }

  // DAILY STREAK - FULLY IMPLEMENTED
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
      const prevDate = parseDateString(sorted[i - 1]!);
      const currDate = parseDateString(sorted[i]!);
      const diffDays = differenceInDays(currDate, prevDate);

      if (diffDays === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    return longest;
  }

  // WEEKLY STREAK - FULLY IMPLEMENTED
  private calculateWeeklyStreak(completions: string[], today: string, target: number): number {
    if (completions.length === 0) return 0;
    let streak = 0;
    const todayDate = parseDateString(today);
    let checkWeekStart = startOfWeek(subDays(todayDate, 7), { weekStartsOn: 1 }); // Previous week

    for (let i = 0; i < 52; i++) {
      const weekEnd = endOfWeek(checkWeekStart, { weekStartsOn: 1 });
      const weekStartStr = format(checkWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      const completionsInWeek = completions.filter(
        (date) => date >= weekStartStr && date <= weekEndStr,
      ).length;

      if (completionsInWeek >= target) {
        streak++;
        checkWeekStart = subDays(checkWeekStart, 7);
      } else {
        break;
      }
    }
    return streak;
  }

  private calculateLongestWeeklyStreak(completions: string[], target: number): number {
    if (completions.length === 0) return 0;
    const sortedCompletions = [...completions].sort();
    if (sortedCompletions.length === 0) return 0;

    const firstDate = parseDateString(sortedCompletions[0]!);
    const lastDate = parseDateString(sortedCompletions[sortedCompletions.length - 1]!);
    let longestStreak = 0;
    let currentStreak = 0;
    let checkWeek = startOfWeek(firstDate, { weekStartsOn: 1 });

    while (checkWeek <= lastDate) {
      const weekEnd = endOfWeek(checkWeek, { weekStartsOn: 1 });
      const weekStartStr = format(checkWeek, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      const completionsInWeek = completions.filter(
        (date) => date >= weekStartStr && date <= weekEndStr,
      ).length;

      if (completionsInWeek >= target) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }

      checkWeek = subDays(checkWeek, -7); // Move to next week
    }

    return longestStreak;
  }

  // CUSTOM DAYS STREAK - FULLY IMPLEMENTED
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
    if (completions.length === 0 || requiredDays.length === 0) return 0;

    const sortedCompletions = [...completions].sort().map((d) => parseDateString(d));
    if (sortedCompletions.length === 0) return 0;

    let longestStreak = 0;
    let currentStreak = 0;
    let lastRequiredDate: Date | null = null;

    for (const completion of sortedCompletions) {
      const dayOfWeek = completion.getDay();

      if (requiredDays.includes(dayOfWeek)) {
        if (lastRequiredDate === null) {
          currentStreak = 1;
        } else {
          // Find next required day after last completion
          let expectedDate = subDays(lastRequiredDate, -1);
          let found = false;

          for (let i = 0; i < 7; i++) {
            if (requiredDays.includes(expectedDate.getDay())) {
              if (format(expectedDate, 'yyyy-MM-dd') === format(completion, 'yyyy-MM-dd')) {
                currentStreak++;
                found = true;
              }
              break;
            }
            expectedDate = subDays(expectedDate, -1);
          }

          if (!found) {
            currentStreak = 1;
          }
        }

        longestStreak = Math.max(longestStreak, currentStreak);
        lastRequiredDate = completion;
      }
    }

    return longestStreak;
  }

  async invalidateCache(habitId: string): Promise<void> {
    await redisClient.del(`streak:${habitId}`);
    logger.debug(`Streak cache invalidated for habit ${habitId}`);
  }

  // Admin function to recalculate all streaks
  async recalculateAllStreaks(): Promise<number> {
    const habits = await prisma.habit.findMany({
      where: { archived: false },
    });

    let count = 0;
    for (const habit of habits) {
      try {
        await this.invalidateCache(habit.id);
        await this.calculateStreak(habit.id);
        count++;
      } catch (error) {
        logger.error(`Failed to recalculate streak for habit ${habit.id}:`, error);
      }
    }

    logger.info(`Recalculated ${count} streaks`);
    return count;
  }
}
