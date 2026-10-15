import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints (login/register)
 * 5 attempts per minute per IP to defend against brute-force attacks
 */
export const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5,
      message: {
        message: 'Too many authentication attempts. Please try again after 1 minute.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

export const apiLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      message: {
        message: 'Too many requests from this IP. Please slow down.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
