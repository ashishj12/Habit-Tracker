import { type Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface FrequencyConfig {
  days?: number[]; // For CUSTOM: [1,3,5] (Monday, Wednesday, Friday)
  target?: number; // For WEEKLY: minimum completions per week
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}

export interface HabitWithStreak {
  id: string;
  name: string;
  description: string | null;
  frequencyType: string;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
}
