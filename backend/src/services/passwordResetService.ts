import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/passwordHash.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { logger } from '../config/logger.js';
import { sendEmail } from '../utils/emailSender.js';

export class PasswordResetService {
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    logger.info(`Password reset email sent to ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: '',
        resetTokenExpiry: null,
      },
    });

    logger.info(`Password reset successful for user ${user.id}`);
  }
}
