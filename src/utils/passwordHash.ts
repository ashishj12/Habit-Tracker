import bcryptjs from 'bcryptjs';

import { CONSTANTS } from '../config/constants.js';

export const hashPassword = async (password: string): Promise<string> => {
  return bcryptjs.hash(password, CONSTANTS.BCRYPT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};
