import { randomInt } from 'node:crypto';

export const generateOtp = (length: number): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  const otp = randomInt(min, max + 1);
  return otp.toString();
};
