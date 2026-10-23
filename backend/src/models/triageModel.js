/**
 * @fileoverview Domain models and Zod validation schemas for LifeBridge emergency triage.
 * Defines schemas for multimodal inputs, extracted clinical facts, recommended bystander actions,
 * verification outcomes, and structured API responses.
 * @module models/triageModel
 */

import { z } from 'zod';
import { LIMITS, URGENCY_LEVELS, FACT_CATEGORIES, FACT_STATUSES } from '../config/constants.js';

/**
 * Regex validating data URL base64 prefix or raw base64 string.
 */
export const BASE64_REGEX = /^(?:data:[a-zA-Z0-9.+/-]+;base64,)?([A-Za-z0-9+/=]+)$/;

/**
 * Estimates decoded byte length of a base64 string without full buffer allocation.
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
 * Schema for optional multimodal image payload uploaded via client canvas.
 * @typedef {z.infer<typeof ImagePayloadSchema>} ImagePayload
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
 * Client request schema for POST /api/analyze.
 * Accepts unstructured Hindi, English, Hinglish text, or base64 image data.
 * @typedef {z.infer<typeof AnalyzeRequestSchema>} AnalyzeRequest
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
      const hasText = Boolean(data.text && data.text.trim().length > 0);
      const hasImage = Boolean(data.image && data.image.data);
      return hasText || hasImage;
    },
    {
      message: 'At least one input source (text or image) must be provided and non-empty.',
      path: ['text']
    }
  );

/**
 * Schema for an individual clinical fact extracted by Gemini.
 * @typedef {z.infer<typeof ExtractedFactSchema>} ExtractedFact
 */
export const ExtractedFactSchema = z.object({
  category: z.enum(FACT_CATEGORIES),
  fact: z.string().min(1),
  source: z.string().min(1)
});

/**
 * Schema for an individual recommended bystander action.
 * @typedef {z.infer<typeof RecommendedActionSchema>} RecommendedAction
 */
export const RecommendedActionSchema = z.object({
  action: z.string().min(1),
  reason: z.string().min(1),
  time_sensitivity: z.string().min(1)
});

/**
 * Strict schema for Gemini Phase 1: Understanding & Multimodal Extraction.
 * @typedef {z.infer<typeof GeminiAnalysisResponseSchema>} GeminiAnalysisResponse
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
 * Schema for an individual fact verification outcome from Layer A corroboration.
 * @typedef {z.infer<typeof FactEvaluationSchema>} FactEvaluation
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
 * Schema for Gemini Phase 2: Fact Verification response.
 * @typedef {z.infer<typeof GeminiVerificationResponseSchema>} GeminiVerificationResponse
 */
export const GeminiVerificationResponseSchema = z.object({
  fact_evaluations: z.array(FactEvaluationSchema).default([]),
  overall_soundness: z.string().default(''),
  suggested_action_pruning: z.array(z.string()).default([])
});

/**
 * Verification metadata attached to the verified triage output.
 */
export const VerificationMetaSchema = z.object({
  status: z.enum(['VERIFIED', 'VERIFIED_WITH_WARNINGS', 'NEEDS_HUMAN_REVIEW']),
  soundness: z.string(),
  prunedActionsCount: z.number(),
  safetyOverridesApplied: z.number(),
  timestamp: z.string()
});
