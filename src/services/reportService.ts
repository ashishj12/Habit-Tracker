import { prisma } from '../config/database.js';
import { sendEmail } from '../utils/emailSender.js';
import { getTodayInTimezone } from '../utils/dateHelpers.js';
import { subDays, format } from 'date-fns';
import { logger } from '../config/logger.js';

export class ReportService {
  async generateWeeklyReport(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const today = getTodayInTimezone(user.timezone);
    const sevenDaysAgo = format(subDays(new Date(today), 7), 'yyyy-MM-dd');

    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      include: {
        streak: true,
        completions: {
          where: {
            completedDate: {
              gte: sevenDaysAgo,
              lte: today,
            },
          },
        },
      },
    });

    const totalHabits = habits.length;
    const totalCompletions = habits.reduce((sum, h) => sum + h.completions.length, 0);
    const expectedCompletions = totalHabits * 7;
    const completionRate =
      expectedCompletions > 0 ? Math.round((totalCompletions / expectedCompletions) * 100) : 0;

    const bestHabit = habits.reduce(
      (best, habit) => (habit.completions.length > (best?.completions.length || 0) ? habit : best),
      habits[0],
    );

    const htmlContent = this.generateWeeklyReportHTML({
      userName: user.name,
      totalHabits,
      totalCompletions,
      completionRate,
      bestHabit: bestHabit
        ? {
            name: bestHabit.name,
            completions: bestHabit.completions.length,
            streak: bestHabit.streak?.currentStreak || 0,
          }
        : null,
      habits: habits.map((h) => ({
        name: h.name,
        completions: h.completions.length,
        streak: h.streak?.currentStreak || 0,
        icon: h.icon,
      })),
    });

    await sendEmail({
      to: user.email,
      subject: '📊 Your Weekly Habit Report',
      html: htmlContent,
    });

    logger.info(`Weekly report sent to user ${userId}`);
  }

  async generateMonthlyReport(userId: string): Promise<void> {
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

    const totalCompletions = habits.reduce((sum, h) => sum + h.completions.length, 0);
    const longestStreak = Math.max(...habits.map((h) => h.streak?.longestStreak || 0), 0);
    const avgStreak =
      habits.length > 0
        ? habits.reduce((sum, h) => sum + (h.streak?.currentStreak || 0), 0) / habits.length
        : 0;

    const htmlContent = this.generateMonthlyReportHTML({
      userName: user.name,
      totalCompletions,
      longestStreak,
      avgStreak: Math.round(avgStreak),
      habits: habits.map((h) => ({
        name: h.name,
        completions: h.completions.length,
        currentStreak: h.streak?.currentStreak || 0,
        longestStreak: h.streak?.longestStreak || 0,
      })),
    });

    await sendEmail({
      to: user.email,
      subject: '🎯 Your Monthly Habit Report',
      html: htmlContent,
    });

    logger.info(`Monthly report sent to user ${userId}`);
  }

  private generateWeeklyReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .stat-box { background: #f7fafc; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .habit-item { padding: 15px; border-left: 4px solid #667eea; margin: 10px 0; 
                        background: #fff; border-radius: 4px; }
          .completion-rate { font-size: 48px; font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Report</h1>
            <p>Hi ${data.userName}! Here's your weekly progress.</p>
          </div>
          
          <div class="stat-box">
            <div class="completion-rate">${data.completionRate}%</div>
            <p>Completion Rate</p>
            <p>${data.totalCompletions} out of ${data.totalHabits * 7} possible completions</p>
          </div>

          ${
            data.bestHabit
              ? `
            <div class="stat-box">
              <h3>🏆 Best Habit This Week</h3>
              <p><strong>${data.bestHabit.name}</strong></p>
              <p>${data.bestHabit.completions} completions | ${data.bestHabit.streak} day streak</p>
            </div>
          `
              : ''
          }

          <h3>All Habits</h3>
          ${data.habits
            .map(
              (h: any) => `
            <div class="habit-item">
              <strong>${h.icon} ${h.name}</strong><br>
              ${h.completions}/7 days | Streak: ${h.streak}
            </div>
          `,
            )
            .join('')}

          <p style="text-align: center; color: #666; margin-top: 30px;">
            Keep up the great work! 🎯
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generateMonthlyReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .stats { display: flex; justify-content: space-around; margin: 30px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 36px; font-weight: bold; color: #f5576c; }
          .habit-row { padding: 15px; margin: 10px 0; background: #f7fafc; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Monthly Report</h1>
            <p>Hi ${data.userName}! Here's your month in review.</p>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">${data.longestStreak}</div>
              <p>Longest Streak</p>
            </div>
            <div class="stat">
              <div class="stat-number">${data.avgStreak}</div>
              <p>Avg Streak</p>
            </div>
          </div>

          <h3>Habit Performance</h3>
          ${data.habits
            .map(
              (h: any) => `
            <div class="habit-row">
              <strong>${h.name}</strong><br>
              ${h.completions} completions | Current: ${h.currentStreak} | Best: ${h.longestStreak}
            </div>
          `,
            )
            .join('')}

          <p style="text-align: center; color: #666; margin-top: 30px;">
            Amazing progress this month! 🚀
          </p>
        </div>
      </body>
      </html>
    `;
  }
}