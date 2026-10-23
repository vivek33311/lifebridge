/**
 * @fileoverview Controller for emergency analysis operations.
 * Coordinates input validation, LRU caching, Gemini understanding,
 * and three-layer verification pipeline.
 * @module controllers/analyzeController
 */

import { STATIC_EMERGENCY_FALLBACK } from '../config/constants.js';
import { callGeminiUnderstand } from '../services/gemini.js';
import { runVerificationPipeline } from '../services/verifier.js';
import { analyzeCache, LruTtlCache } from '../utils/cache.js';
import { formatErrorResponse } from '../utils/errors.js';
import { validateAnalyzeRequest } from '../utils/validation.js';

/**
 * Handles emergency analysis requests (POST /api/analyze).
 * Accepts messy multilingual text, voice transcripts, and base64 imagery.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with triage analysis.
 */
export async function handleAnalyze(req, res) {
  try {
    // 1. Strict input validation & sanitization
    const validatedInput = validateAnalyzeRequest(req.body);

    // 2. Cache check for identical queries
    const cacheKey = LruTtlCache.hashPayload(validatedInput);
    const cachedResponse = analyzeCache.get(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedResponse);
    }

    let primaryAnalysis;
    try {
      // 3. Phase 1: Call Gemini Understanding (Flash model)
      primaryAnalysis = await callGeminiUnderstand({
        text: validatedInput.text,
        image: validatedInput.image
      });
    } catch (geminiError) {
      // Fallback on API failure, timeout, or missing key
      // Ensures the user receives life-saving standard instructions regardless of cloud outages
      const fallbackPayload = {
        ...STATIC_EMERGENCY_FALLBACK,
        _offline_notice: geminiError.message || 'AI service temporarily unavailable'
      };
      analyzeCache.set(cacheKey, fallbackPayload);
      res.setHeader('X-Fallback', 'true');
      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(fallbackPayload);
    }

    // 4. Phase 2: Execute 3-Layer Verification Pipeline
    const { verifiedAnalysis, verificationMeta } = await runVerificationPipeline({
      text: validatedInput.text,
      image: validatedInput.image,
      primaryAnalysis,
      checkConsistency: true
    });

    const finalResult = {
      ...verifiedAnalysis,
      verification: verificationMeta
    };

    // 5. Cache result in LRU
    analyzeCache.set(cacheKey, finalResult);

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(finalResult);
  } catch (err) {
    const { statusCode, body } = formatErrorResponse(err);
    return res.status(statusCode).json(body);
  }
}
