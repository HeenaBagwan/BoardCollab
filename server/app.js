import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Trust first proxy hop (Render / reverse proxy) for express-rate-limit and client IP
  app.set('trust proxy', 1);

  // 1. Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // 2. CORS: Allow only CLIENT_URL, with credentials
  const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = rawClientUrl
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like health checks, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // 3. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Lightweight Cookie Parser Middleware
  app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const key = parts[0]?.trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) {
          req.cookies[key] = decodeURIComponent(value);
        }
      });
    }
    next();
  });

  // 5. Health Check Routes (root /health for Render health checks and /api/health)
  const healthHandler = (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      service: 'boardcollab-server',
      timestamp: new Date().toISOString()
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // 6. API Rate Limiting & Routes
  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/admin', adminRoutes);

  // 7. 404 Catch-All
  app.use('*', (req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
