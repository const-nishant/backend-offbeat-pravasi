import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  APP_URL: Joi.string().uri().default('http://localhost:4000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('offbeat_pravasi'),

  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),

  JWT_ACCESS_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_ACCESS_SECRET is required',
    'string.min': 'JWT_ACCESS_SECRET must be at least 16 characters',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required',
    'string.min': 'JWT_REFRESH_SECRET must be at least 16 characters',
  }),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('30d'),

  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),

  SENDGRID_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().optional(),

  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_PUBLIC_BASE_URL: Joi.string().uri().optional(),

  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),

  RAZORPAY_KEY_ID: Joi.string().optional(),
  RAZORPAY_KEY_SECRET: Joi.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().optional(),

  ADMIN_EMAILS: Joi.string().optional(),
  ADMIN_PASSWORD_HASHES: Joi.string().optional(),
  GLOBAL_API_KEY: Joi.string().optional(),

  OTP_EXPIRY_MINUTES: Joi.number().default(10),
  OTP_LENGTH: Joi.number().default(6),
  OTP_MAX_ATTEMPTS: Joi.number().default(5),
});
