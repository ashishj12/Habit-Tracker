import { prisma } from '../config/database.js';
import { subDays, format } from 'date-fns';
import { getTodayInTimezone } from '../utils/dateHelpers.js';

export class AnalyticsService {
  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const today = getTodayInTimezone(user.timezone);
    const thirtyDaysAgo = subDays(today, 30);

    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      include: {
        streak: true,
        completions: {
          where: {
            completedDate: {
              gte: thirtyDaysAgo,
              lte: today,
            },
          },
        },
      },
    });

    const totalHabits = habits.length;
    const totalCompletions = habits.reduce((sum, h) => sum + h.completions.length, 0);

    const averageStreak =
      totalHabits > 0
        ? habits.reduce((sum, h) => sum + (h.streak?.currentStreak || 0), 0) / totalHabits
        : 0;

    const longestStreak = Math.max(...habits.map((h) => h.streak?.longestStreak || 0), 0);

    // Completion rate (30-day window)
    const expectedCompletions = totalHabits * 30;
    const completionRate =
      expectedCompletions > 0 ? (totalCompletions / expectedCompletions) * 100 : 0;

    // Group completions by date (convert Dates to strings)
    const completionsByDate: Record<string, number> = {};
    for (const habit of habits) {
      for (const completion of habit.completions) {
        if (!completion.completedDate) continue; // skip null
        const key = format(completion.completedDate, 'yyyy-MM-dd');
        completionsByDate[key] = (completionsByDate[key] || 0) + 1;
      }
    }

    return {
      totalHabits,
      totalCompletions,
      averageStreak: Math.round(averageStreak * 10) / 10,
      longestStreak,
      completionRate: Math.round(completionRate * 10) / 10,
      completionsByDate,
      last30Days: {
        totalCompletions,
        dates: Object.entries(completionsByDate).map(([date, count]) => ({
          date,
          count,
        })),
      },
    };
  }

  async getHabitAnalytics(habitId: string, userId: string) {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: {
        streak: true,
        completions: { orderBy: { completedDate: 'desc' } },
        user: true,
      },
    });

    if (!habit) throw new Error('Habit not found');

    const today = getTodayInTimezone(habit.user.timezone);
    const ninetyDaysAgo = subDays(today, 90);

    const recentCompletions = habit.completions.filter(
      (c) => c.completedDate && c.completedDate >= ninetyDaysAgo
    );

    // Count completions by day of week
    const dayOfWeekCounts: Record<number, number> = {};
    for (const c of recentCompletions) {
      if (!c.completedDate) continue;
      const day = c.completedDate.getDay();
      dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;
    }

    const bestDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      totalCompletions: habit.completions.length,
      currentStreak: habit.streak?.currentStreak || 0,
      longestStreak: habit.streak?.longestStreak || 0,
      last90Days: {
        completions: recentCompletions.length,
        completionRate: (recentCompletions.length / 90) * 100,
      },
      bestDayOfWeek: bestDay
        ? { day: dayNames[parseInt(bestDay[0])], count: bestDay[1] }
        : null,
      recentCompletions: recentCompletions.slice(0, 10),
    };
  }
}
