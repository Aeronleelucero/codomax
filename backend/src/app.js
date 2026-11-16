import express from 'express';
import { productionSecurity } from './middleware/security.middleware.js';
import { logFailure } from './utils/logger.js';
import { requireCsrf } from './middleware/csrf.middleware.js';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import blogRoutes from './routes/blog.routes.js';

import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import { AppError } from './utils/AppError.js';

const app = express();
app.disable('x-powered-by');
if (env.trustProxy) app.set('trust proxy', env.trustProxy);
app.use(productionSecurity);

// Allow requests from the Artikly frontend.
app.use(
  cors({
    origin: env.frontendUrls,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
  })
);

// Parse incoming JSON requests.
app.use(express.json({ limit: '1mb' }));

// CSRF checks include login, registration, profile changes and logout.
app.use('/api', requireCsrf);

// API routes.
app.use('/api/health', healthRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);

// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

// Centralized error handler.
// - AppError (thrown by services): its own status, message and field errors.
// - Invalid JSON body (from express.json): 400 with a friendly message.
// - Anything else is unexpected: logged, and answered with a generic 500 so
//   internal details (SQL, stack traces) never reach the client.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  logFailure('request_failed');
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

export default app;
