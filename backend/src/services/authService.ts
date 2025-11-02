import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import { generateToken } from '../utils/jwtToken.js';
import { hashPassword, comparePassword } from '../utils/passwordHash.js';

export class AuthService {
  async register(email: string, password: string, name: string, timezone = 'UTC') {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new AppError(400, 'Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        timezone,
        resetToken: '',
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid credentials');
    }

    const token = generateToken({ id: user.id, email: user.email });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user;
  }
}
