import { prisma } from '../config/database.js';
import { subDays, format } from 'date-fns';
import { getTodayInTimezone } from '../utils/dateHelpers.js';

export class AnalyticsService {
  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const today = getTodayInTimezone(user.timezone);
    const thirtyDaysAgo = format(subDays(new Date(today), 30), 'yyyy-MM-dd');

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

    // Completion rate in last 30 days
    const expectedCompletions = totalHabits * 30; // Simplified for daily habits
    const completionRate =
      expectedCompletions > 0 ? (totalCompletions / expectedCompletions) * 100 : 0;

    // Completions by date
    const completionsByDate: Record<string, number> = {};
    habits.forEach((habit) => {
      habit.completions.forEach((completion) => {
        completionsByDate[completion.completedDate] =
          (completionsByDate[completion.completedDate] || 0) + 1;
      });
    });

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
        completions: {
          orderBy: { completedDate: 'desc' },
        },
        user: true,
      },
    });

    if (!habit) throw new Error('Habit not found');

    const today = getTodayInTimezone(habit.user.timezone);
    const ninetyDaysAgo = format(subDays(new Date(today), 90), 'yyyy-MM-dd');

    const recentCompletions = habit.completions.filter((c) => c.completedDate >= ninetyDaysAgo);

    // Day of week analysis
    const dayOfWeekCounts: Record<number, number> = {};
    recentCompletions.forEach((c) => {
      const date = new Date(c.completedDate);
      const day = date.getDay();
      dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;
    });

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
        ? {
            day: dayNames[parseInt(bestDay[0])],
            count: bestDay[1],
          }
        : null,
      recentCompletions: recentCompletions.slice(0, 10),
    };
  }
}
