export const generateOtp = (length: number): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  return otp.toString();
};
