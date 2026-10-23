/**
 * @fileoverview Centralized configuration, enums, and constants for LifeBridge.
 * @module config/constants
 */

/**
 * Standard urgency tiers for emergency assessment.
 * @readonly
 * @enum {string}
 */
export const URGENCY_LEVELS = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

/**
 * Numerical weight for urgency escalation comparisons.
 * Higher number indicates greater clinical severity.
 * @readonly
 * @type {Record<string, number>}
 */
export const URGENCY_RANKS = Object.freeze({
  [URGENCY_LEVELS.CRITICAL]: 4,
  [URGENCY_LEVELS.HIGH]: 3,
  [URGENCY_LEVELS.MEDIUM]: 2,
  [URGENCY_LEVELS.LOW]: 1
});

/**
 * Verification outcome status categories.
 * @readonly
 * @enum {string}
 */
export const VERIFICATION_STATUSES = Object.freeze({
  VERIFIED: 'VERIFIED',
  VERIFIED_WITH_WARNINGS: 'VERIFIED_WITH_WARNINGS',
  NEEDS_HUMAN_REVIEW: 'NEEDS_HUMAN_REVIEW'
});

/**
 * Fact corroboration states against raw user input.
 * @readonly
 * @enum {string}
 */
export const FACT_STATUSES = Object.freeze({
  SUPPORTED: 'SUPPORTED',
  INFERRED: 'INFERRED',
  UNSUPPORTED: 'UNSUPPORTED'
});

/**
 * Valid medical fact categories.
 * @readonly
 * @type {readonly string[]}
 */
export const FACT_CATEGORIES = Object.freeze([
  'condition',
  'medication',
  'allergy',
  'symptom'
]);

/**
 * Validation limits for incoming payloads.
 * @readonly
 */
export const LIMITS = Object.freeze({
  MAX_TEXT_LENGTH: 10000,
  MAX_IMAGE_BYTES: 4 * 1024 * 1024, // 4 MB
  ALLOWED_IMAGE_MIMES: Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
});

/**
 * Rate limiter defaults.
 * @readonly
 */
export const RATE_LIMIT = Object.freeze({
  WINDOW_MS: 60 * 1000, // 1 minute
  MAX_REQUESTS: 30
});

/**
 * LRU Cache configuration.
 * @readonly
 */
export const CACHE_CONFIG = Object.freeze({
  MAX_ITEMS: 100,
  TTL_MS: 5 * 60 * 1000 // 5 minutes
});

/**
 * Gemini client defaults and resilience parameters.
 * @readonly
 */
export const GEMINI_CONFIG = Object.freeze({
  DEFAULT_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  TIMEOUT_MS: 12000,
  MAX_RETRIES: 2,
  INITIAL_BACKOFF_MS: 500
});

/**
 * Deterministic offline fallback returned when AI service is unavailable.
 * Ensures bystanders still receive verified immediate first-aid instructions.
 * @readonly
 */
export const STATIC_EMERGENCY_FALLBACK = Object.freeze({
  situation_summary: 'Automated AI analysis is temporarily unavailable. Displaying standard national emergency first-aid protocol.',
  urgency_level: URGENCY_LEVELS.CRITICAL,
  extracted_facts: [
    {
      category: 'symptom',
      fact: 'Unspecified acute medical emergency reported by user',
      source: 'offline_emergency_protocol'
    }
  ],
  recommended_actions: [
    {
      action: 'Call 108 or 112 immediately for emergency medical dispatch.',
      reason: 'Standard protocol for acute or unidentified emergencies in India.',
      time_sensitivity: 'Immediate (within 60 seconds)'
    },
    {
      action: 'Check ABC: Airway, Breathing, and Circulation.',
      reason: 'Ensure victim is breathing and airway is clear before any movement.',
      time_sensitivity: 'Immediate'
    },
    {
      action: 'Do NOT give water, food, or oral medications if patient is disoriented or unresponsive.',
      reason: 'Prevents choking and dangerous pulmonary aspiration.',
      time_sensitivity: 'Continuous precaution'
    },
    {
      action: 'If bleeding heavily, apply direct pressure with a clean cloth.',
      reason: 'Controls external blood loss until paramedics arrive.',
      time_sensitivity: 'Immediate'
    }
  ],
  call_108_script: 'Namaste 108 operator. This is an urgent medical emergency. Location: [Provide landmark/address]. The patient requires immediate 108 ambulance dispatch. Please dispatch an Advanced Life Support unit.',
  missing_information: [
    'Patient consciousness level',
    'Breathing rate and regularity',
    'Exact location landmark',
    'Pre-existing known allergies'
  ],
  confidence_score: 0.5,
  verification: {
    status: VERIFICATION_STATUSES.NEEDS_HUMAN_REVIEW,
    reasoning: 'Generated from certified deterministic offline fallback due to upstream AI unavailability.',
    fact_audit: [
      {
        fact: 'Unspecified acute medical emergency reported by user',
        status: FACT_STATUSES.INFERRED,
        detail: 'Protocol applied autonomously during offline fallback'
      }
    ],
    overrides_applied: [],
    consistency_passed: false
  }
});
