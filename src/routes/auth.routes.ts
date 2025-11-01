import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema } from '../utils/validators';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const authController = new AuthController();

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
});

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, validateRequest(updateProfileSchema), authController.updateProfile);
router.post('/request-reset', validateRequest(passwordResetRequestSchema), authController.requestPasswordReset);
router.post('/reset-password', validateRequest(passwordResetSchema), authController.resetPassword);

export default router;