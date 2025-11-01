import jwt, { type SignOptions } from 'jsonwebtoken';
import { CONSTANTS } from '../config/constants.js';

export const generateToken = (payload: { id: string; email: string }): string => {
  const options: SignOptions = {
    expiresIn: CONSTANTS.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, CONSTANTS.JWT_SECRET, options);
};

export const verifyToken = (token: string): { id: string; email: string } => {
  return jwt.verify(token, CONSTANTS.JWT_SECRET) as { id: string; email: string };
};
