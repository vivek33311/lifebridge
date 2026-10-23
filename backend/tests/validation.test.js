/**
 * @fileoverview Unit tests for Zod validation schemas and payload boundaries.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  calculateBase64Bytes,
  validateAnalyzeRequest,
  GeminiAnalysisResponseSchema
} from '../src/utils/validation.js';
import { ValidationError } from '../src/utils/errors.js';
import { URGENCY_LEVELS } from '../src/config/constants.js';

describe('Validation Schemas & Payload Checks', () => {
  test('calculateBase64Bytes computes accurate byte length without full decoding', () => {
    // 'SGVsbG8=' is 'Hello' (5 bytes)
    assert.equal(calculateBase64Bytes('SGVsbG8='), 5);
    // With data-URL prefix
    assert.equal(calculateBase64Bytes('data:image/png;base64,SGVsbG8='), 5);
    assert.equal(calculateBase64Bytes(''), 0);
    assert.equal(calculateBase64Bytes(null), 0);
  });

  test('validateAnalyzeRequest accepts valid text input', () => {
    const payload = { text: 'Severe headache and vomiting after fever.' };
    const validated = validateAnalyzeRequest(payload);
    assert.equal(validated.text, 'Severe headache and vomiting after fever.');
  });

  test('validateAnalyzeRequest accepts valid image payload', () => {
    const payload = {
      image: {
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/',
        mimeType: 'image/jpeg'
      }
    };
    const validated = validateAnalyzeRequest(payload);
    assert.equal(validated.image.mimeType, 'image/jpeg');
  });

  test('validateAnalyzeRequest rejects completely empty request', () => {
    assert.throws(
      () => validateAnalyzeRequest({ text: '', image: undefined }),
      (err) => err instanceof ValidationError && err.message.includes('At least one input source')
    );
  });

  test('validateAnalyzeRequest rejects text exceeding maximum allowed length', () => {
    const longText = 'A'.repeat(10001);
    assert.throws(
      () => validateAnalyzeRequest({ text: longText }),
      (err) => err instanceof ValidationError
    );
  });

  test('validateAnalyzeRequest rejects disallowed image MIME type', () => {
    const payload = {
      text: 'Accident scene',
      image: {
        data: 'SGVsbG8=',
        mimeType: 'image/gif'
      }
    };
    assert.throws(
      () => validateAnalyzeRequest(payload),
      (err) => err instanceof ValidationError && err.details.issues.some((i) => i.message.includes('MIME type'))
    );
  });

  test('validateAnalyzeRequest rejects malformed base64 image data', () => {
    const payload = {
      image: {
        data: '!!!NotValidBase64@@@',
        mimeType: 'image/png'
      }
    };
    assert.throws(
      () => validateAnalyzeRequest(payload),
      (err) => err instanceof ValidationError
    );
  });

  test('GeminiAnalysisResponseSchema validates conforming Gemini output', () => {
    const mockOutput = {
      situation_summary: 'Acute myocardial infarction suspected.',
      urgency_level: URGENCY_LEVELS.CRITICAL,
      extracted_facts: [
        { category: 'symptom', fact: 'Chest pain radiating to left arm', source: 'user text' }
      ],
      recommended_actions: [
        { action: 'Call 108', reason: 'Emergency medical dispatch', time_sensitivity: 'Immediate' }
      ],
      call_108_script: 'Patient has acute chest pain. Immediate dispatch needed.',
      missing_information: ['Known diabetic status'],
      confidence_score: 0.95
    };

    const parsed = GeminiAnalysisResponseSchema.parse(mockOutput);
    assert.equal(parsed.urgency_level, URGENCY_LEVELS.CRITICAL);
    assert.equal(parsed.extracted_facts.length, 1);
  });

  test('GeminiAnalysisResponseSchema rejects output missing required fields', () => {
    const invalidOutput = {
      situation_summary: 'Some summary'
      // missing urgency_level, recommended_actions, call_108_script
    };
    assert.throws(() => GeminiAnalysisResponseSchema.parse(invalidOutput));
  });
});
