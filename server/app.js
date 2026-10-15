import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // 1. Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // 2. CORS Allowlist
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
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

  // 5. Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'boardcollab-server',
      timestamp: new Date().toISOString()
    });
  });

  // 6. API Rate Limiting & Routes
  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);

  // 7. 404 Catch-All
  app.use('*', (req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
