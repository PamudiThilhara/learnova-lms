import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { apiRouter } from './routes/index.js';
import { resolveSession } from './services/auth.js';
import { errorHandler, HttpError } from './middleware/errors.js';

export function createApp(config, options = {}) {
  const app = express();
  app.locals.config = config; app.locals.mailEnv = options.env ?? process.env;
  app.locals.mailer = options.mailer;
  app.locals.aiEnv = options.aiEnv ?? process.env;
  app.locals.quizGenerator = options.quizGenerator;
  app.disable('x-powered-by');
  if (config.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin(origin, callback) { callback(null, !origin || config.origins.includes(origin)); }, credentials: true, allowedHeaders: ['Content-Type', 'X-Learnova-Request'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-Learnova-Request') !== '1' || (req.get('Origin') && !config.origins.includes(req.get('Origin')))) return next(new HttpError(403, 'Request origin or CSRF header is invalid.'));
    }
    next();
  });
  app.use('/api', rateLimit({ windowMs: 60000, limit: config.NODE_ENV === 'test' ? 10000 : 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many requests. Please wait a moment.' } }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.get('/api/health', async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new Error();
      await mongoose.connection.db.command({ ping: 1 }, { timeoutMS: 3000 });
      res.json({ status: 'ok', database: 'connected' });
    } catch { res.status(503).json({ status: 'unavailable', database: 'disconnected' }); }
  });
  app.use('/api', resolveSession, apiRouter(config));
  app.use((req, res, next) => next(new HttpError(404, 'API route not found.')));
  app.use(errorHandler);
  return app;
}
