import jwt from 'jsonwebtoken';
import { CONSTANTS } from '../config/constants.js';

export const generateToken = (payload: { id: string; email: string }): string => {
  return jwt.sign(payload, CONSTANTS.JWT_SECRET, {
    expiresIn: CONSTANTS.JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): { id: string; email: string } => {
  return jwt.verify(token, CONSTANTS.JWT_SECRET) as { id: string; email: string };
};
