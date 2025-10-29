import { type Request, type Response, type NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { type AuthRequest } from '../types/index.js';

const authService = new AuthService();
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
}