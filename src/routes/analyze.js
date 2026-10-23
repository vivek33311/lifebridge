/**
 * @fileoverview Express router for POST /api/analyze.
 * Mounts controller actions for emergency analysis.
 * @module routes/analyze
 */

import { Router } from 'express';
import { handleAnalyze } from '../controllers/analyzeController.js';

const router = Router();

/**
 * Route: POST /api/analyze
 * Delegates to analyzeController.
 */
router.post('/analyze', handleAnalyze);

export default router;
