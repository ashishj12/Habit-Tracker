import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  timezone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const createHabitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100),
  description: z.string().max(500).optional(),
  frequencyType: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']),
  frequencyConfig: z.object({
    days: z.array(z.number().min(0).max(6)).optional(),
    target: z.number().min(1).max(7).optional(),
  }),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(10).optional(),
});

export const completeHabitSchema = z.object({
  completedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(500).optional(),
});
