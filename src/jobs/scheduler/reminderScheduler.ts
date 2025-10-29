import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { notificationQueue } from '../queue/notificationQueue.js';
import { getTodayInTimezone } from '../../utils/dateHelpers.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const startReminderScheduler = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running reminder scheduler...');
    try {
      const now = new Date();
      // Get all habits with reminders enabled
      const habits = await prisma.habit.findMany({
        where: {
          reminderEnable: true,
          archived: false,
        },
        include: {
          user: true,
          completions: true,
        },
      });

      for (const habit of habits) {
        const userTimezone = habit.user.timezone;
        const userNow = toZonedTime(now, userTimezone);
        const currentTime = format(userNow, 'HH:mm');
        const today = getTodayInTimezone(userTimezone);

        // Check if reminder time matches (within 15-minute window)
        if (!habit.reminderTime) continue;
        const reminderParts = habit.reminderTime.split(':').map(Number);
        const currentParts = currentTime.split(':').map(Number);
        const reminderHour = reminderParts[0];
        const reminderMinute = reminderParts[1];
        const currentHour = currentParts[0];
        const currentMinute = currentParts[1];

        // Validate parsed numbers
        if (
          reminderHour == null ||
          reminderMinute == null ||
          currentHour == null ||
          currentMinute == null ||
          Number.isNaN(reminderHour) ||
          Number.isNaN(reminderMinute) ||
          Number.isNaN(currentHour) ||
          Number.isNaN(currentMinute)
        ) {
          console.warn(`Skipping habit ${habit.id} due to invalid time parsing`);
          continue;
        }

        const timeDiff = Math.abs(
          currentHour * 60 + currentMinute - (reminderHour * 60 + reminderMinute),
        );

        if (timeDiff <= 15) {
          // Check if already completed today
          const completedToday = habit.completions.some((c) => c.completedDate === today);
          if (completedToday) {
            console.log(`Habit ${habit.id} already completed today, skipping reminder`);
            continue;
          }

          // Check if notification already queued/sent
          const existing = await prisma.notificationLog.findUnique({
            where: {
              habitId_notificationDate: {
                habitId: habit.id,
                notificationDate: today,
              },
            },
          });

          if (existing) {
            console.log(`Notification already processed for habit ${habit.id}`);
            continue;
          }

          // Queue notification
          await notificationQueue.add(
            'send-reminder',
            {
              habitId: habit.id,
              userId: habit.userId,
              userEmail: habit.user.email,
              habitName: habit.name,
              notificationDate: today,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            },
          );

          console.log(`Queued reminder for habit ${habit.id}`);
        }
      }
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });

  console.log('Reminder scheduler started');
};
