/**
 * @fileoverview Zod schemas and validation helpers for request payloads and Gemini responses.
 * Re-exports domain models from models/triageModel for backwards compatibility.
 * @module utils/validation
 */

import { ValidationError } from './errors.js';
import { sanitizeText } from './sanitize.js';
import {
  BASE64_REGEX,
  calculateBase64Bytes,
  ImagePayloadSchema,
  AnalyzeRequestSchema,
  ExtractedFactSchema,
  RecommendedActionSchema,
  GeminiAnalysisResponseSchema,
  FactEvaluationSchema,
  GeminiVerificationResponseSchema,
  VerificationMetaSchema
} from '../models/triageModel.js';

// Re-export domain models for consumers
export {
  BASE64_REGEX,
  calculateBase64Bytes,
  ImagePayloadSchema,
  AnalyzeRequestSchema,
  ExtractedFactSchema,
  RecommendedActionSchema,
  GeminiAnalysisResponseSchema,
  FactEvaluationSchema,
  GeminiVerificationResponseSchema,
  VerificationMetaSchema
};

/**
 * Validates incoming client request body.
 *
 * @param {unknown} body - Raw request body from Express.
 * @returns {import('../models/triageModel.js').AnalyzeRequest} Validated payload.
 * @throws {ValidationError} When schema validation fails.
 */
export function validateAnalyzeRequest(body) {
  const result = AnalyzeRequestSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message
    }));
    const primaryMessage = issues[0]?.message || 'Invalid request payload';
    throw new ValidationError(primaryMessage, { issues });
  }
  return {
    ...result.data,
    text: sanitizeText(result.data.text)
  };
}
