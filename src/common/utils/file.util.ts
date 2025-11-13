import { extname } from 'path';

export const getFileExtension = (filename: string): string => {
  return extname(filename).replace('.', '').toLowerCase();
};

export const generateFileKey = (prefix: string): string => {
  const random = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();

  return `${prefix}/${timestamp}-${random}`;
};
