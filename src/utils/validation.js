/**
 * @fileoverview Zod schemas and validation helpers for request payloads and Gemini responses.
 * @module utils/validation
 */

import { z } from 'zod';
import { LIMITS, URGENCY_LEVELS, FACT_CATEGORIES, FACT_STATUSES } from '../config/constants.js';
import { ValidationError } from './errors.js';
import { sanitizeText } from './sanitize.js';

/**
 * Regex validating data URL base64 prefix or raw base64 string.
 */
const BASE64_REGEX = /^(?:data:[a-zA-Z0-9.+/-]+;base64,)?([A-Za-z0-9+/=]+)$/;

/**
 * Validates and decodes base64 payload size.
 *
 * @param {string} b64 - Base64 encoded string.
 * @returns {number} Estimated decoded size in bytes.
 */
export function calculateBase64Bytes(b64) {
  if (!b64 || typeof b64 !== 'string') return 0;
  const cleanB64 = b64.replace(/^data:[a-zA-Z0-9.+/-]+;base64,/, '').trim();
  const padding = cleanB64.endsWith('==') ? 2 : cleanB64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((cleanB64.length * 3) / 4) - padding);
}

/**
 * Schema for optional image object uploaded via client.
 */
export const ImagePayloadSchema = z.object({
  data: z
    .string()
    .min(1, 'Image data is required')
    .refine((val) => BASE64_REGEX.test(val.trim()), {
      message: 'Image data must be a valid base64 or data-URL encoded string'
    })
    .refine((val) => calculateBase64Bytes(val) <= LIMITS.MAX_IMAGE_BYTES, {
      message: `Image exceeds the maximum allowed size of ${LIMITS.MAX_IMAGE_BYTES / (1024 * 1024)} MB`
    }),
  mimeType: z
    .string()
    .refine(
      (mime) => LIMITS.ALLOWED_IMAGE_MIMES.includes(mime.toLowerCase()),
      {
        message: `MIME type must be one of: ${LIMITS.ALLOWED_IMAGE_MIMES.join(', ')}`
      }
    )
});

/**
 * Request schema for POST /api/analyze.
 */
export const AnalyzeRequestSchema = z
  .object({
    text: z
      .string()
      .max(LIMITS.MAX_TEXT_LENGTH, `Text exceeds maximum length of ${LIMITS.MAX_TEXT_LENGTH} characters`)
      .optional()
      .default(''),
    image: ImagePayloadSchema.optional()
  })
  .refine(
    (data) => {
      const hasText = Boolean(data.text && sanitizeText(data.text).length > 0);
      const hasImage = Boolean(data.image && data.image.data);
      return hasText || hasImage;
    },
    {
      message: 'At least one input source (text or image) must be provided and non-empty.',
      path: ['text']
    }
  );

/**
 * Schema for an individual fact extracted by Gemini.
 */
export const ExtractedFactSchema = z.object({
  category: z.enum(['condition', 'medication', 'allergy', 'symptom']),
  fact: z.string().min(1),
  source: z.string().min(1)
});

/**
 * Schema for an individual recommended action.
 */
export const RecommendedActionSchema = z.object({
  action: z.string().min(1),
  reason: z.string().min(1),
  time_sensitivity: z.string().min(1)
});

/**
 * Strict schema for Gemini Phase 1: Understanding & Extraction.
 */
export const GeminiAnalysisResponseSchema = z.object({
  situation_summary: z.string().min(1),
  urgency_level: z.enum([
    URGENCY_LEVELS.CRITICAL,
    URGENCY_LEVELS.HIGH,
    URGENCY_LEVELS.MEDIUM,
    URGENCY_LEVELS.LOW
  ]),
  extracted_facts: z.array(ExtractedFactSchema).default([]),
  recommended_actions: z.array(RecommendedActionSchema).min(1),
  call_108_script: z.string().min(1),
  missing_information: z.array(z.string()).default([]),
  confidence_score: z.number().min(0).max(1)
});

/**
 * Schema for an individual fact verification judgment.
 */
export const FactEvaluationSchema = z.object({
  fact: z.string(),
  status: z.enum([
    FACT_STATUSES.SUPPORTED,
    FACT_STATUSES.INFERRED,
    FACT_STATUSES.UNSUPPORTED
  ]),
  detail: z.string().default('')
});

/**
 * Strict schema for Gemini Phase 2: Fact Verification.
 */
export const GeminiVerificationResponseSchema = z.object({
  fact_evaluations: z.array(FactEvaluationSchema).default([]),
  overall_soundness: z.string().default(''),
  suggested_action_pruning: z.array(z.string()).default([])
});

/**
 * Validates incoming client request body.
 *
 * @param {unknown} body - Raw request body from Express.
 * @returns {z.infer<typeof AnalyzeRequestSchema>} Validated payload.
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
