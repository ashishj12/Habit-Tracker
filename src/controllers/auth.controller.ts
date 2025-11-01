import { type Request, type Response, type NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { PasswordResetService } from '../services/passwordResetService.js';
import { type AuthRequest } from '../types/index.js';
import { prisma } from '../config/database.js';

const authService = new AuthService();
const passwordResetService = new PasswordResetService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, timezone } = req.body;
      const result = await authService.register(email, password, name, timezone);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const profile = await authService.getProfile(userId);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await passwordResetService.requestPasswordReset(email);
      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await passwordResetService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, timezone } = req.body;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(timezone && { timezone }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
        },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
}
