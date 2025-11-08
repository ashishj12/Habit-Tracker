import { format, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const getTodayInTimezone = (timezone: string): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
};

export const formatDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const parseDateString = (dateStr: string): Date => {
  return parseISO(dateStr);
};

export const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  const dateObj = parseDateString(date);
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  return isWithinInterval(dateObj, { start, end });
};

export const getYesterdayInTimezone = (timezone: string): string => {
  const today = getTodayInTimezone(timezone);
  const todayDate = parseDateString(today);
  const yesterday = subDays(todayDate, 1);
  return formatDateString(yesterday);
};

export const getDayOfWeek = (dateStr: string): number => {
  // Returns 0-6 (Sunday-Saturday)
  return parseDateString(dateStr).getDay();
};

export const getDayRangeInTimezone = (timezone: string) => {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const start = startOfDay(zonedNow);
  const end = endOfDay(zonedNow);
  return { start, end };
};

export const getTodayDateInTimezone = (timezone: string): Date => {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  return startOfDay(zonedNow);
};
