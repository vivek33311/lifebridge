/**
 * @fileoverview Express application bootstrap and middleware configuration.
 * Hardened with Helmet CSP, rate limiting, and defensive body parsing.
 * @module server
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { RATE_LIMIT } from './config/constants.js';
import analyzeRouter from './routes/analyze.js';
import { formatErrorResponse } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// 1. Hardened Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. Strict CORS policy
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || false, // Same-origin only by default
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);

// 3. Body parsers with defensive size caps
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// 4. Rate Limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address. Please wait a moment before trying again.'
    }
  }
});
app.use('/api', apiLimiter);

// 5. Static Assets (Vanilla HTML/CSS/JS frontend & self-hosted modules)
app.use('/vendor/three', express.static(path.join(__dirname, '../node_modules/three/build')));
app.use('/src', express.static(path.join(__dirname, '../src')));
app.use(express.static(path.join(__dirname, '../public')));

// 6. Health Check Probe
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'LifeBridge',
    timestamp: new Date().toISOString()
  });
});

// 7. API Routes
app.use('/api', analyzeRouter);

// 8. 404 Handler for unrecognized API routes
app.use('/api', (_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint does not exist.'
    }
  });
});

// 9. Centralized Error Handling Middleware
app.use((err, _req, res, _next) => {
  const { statusCode, body } = formatErrorResponse(err);
  res.status(statusCode).json(body);
});

// Start listening if run as main script
const PORT = process.env.PORT || 3000;
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[LifeBridge] Production emergency server listening on port ${PORT}`);
  });
}
