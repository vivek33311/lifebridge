/**
 * @fileoverview Unit tests for Gemini client wrapper, prompt construction, and retry mechanisms.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  getGeminiClient,
  buildContents,
  executeWithRetry,
  callGeminiUnderstand,
  callGeminiVerify
} from '../src/services/gemini.js';
import { GeminiServiceError } from '../src/utils/errors.js';
import { URGENCY_LEVELS } from '../src/config/constants.js';

describe('Gemini Service Wrapper & Retries', () => {
  test('getGeminiClient throws GeminiServiceError when API key is missing', () => {
    assert.throws(
      () => getGeminiClient(''),
      (err) => err instanceof GeminiServiceError && err.message.includes('GEMINI_API_KEY')
    );
  });

  test('buildContents constructs payload with text only when no image provided', () => {
    const contents = buildContents('Emergency prompt', null);
    assert.equal(contents.length, 1);
    assert.equal(contents[0], 'Emergency prompt');
  });

  test('buildContents constructs multimodal payload with inlineData when image provided', () => {
    const img = {
      data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png'
    };
    const contents = buildContents('Multimodal prompt', img);
    assert.equal(contents.length, 2);
    assert.equal(contents[0], 'Multimodal prompt');
    assert.equal(typeof contents[1], 'object');
    assert.equal(contents[1].inlineData.mimeType, 'image/png');
    assert.equal(contents[1].inlineData.data.startsWith('data:'), false);
  });

  test('executeWithRetry retries failed transient attempts before succeeding', async () => {
    let callCount = 0;
    const task = async () => {
      callCount += 1;
      if (callCount < 2) {
        throw new Error('Transient network timeout');
      }
      return 'SUCCESS';
    };

    const result = await executeWithRetry(task, 2, 10);
    assert.equal(result, 'SUCCESS');
    assert.equal(callCount, 2);
  });

  test('executeWithRetry throws if retries are exhausted', async () => {
    let callCount = 0;
    const task = async () => {
      callCount += 1;
      throw new Error('Persistent 500 error');
    };

    await assert.rejects(
      async () => executeWithRetry(task, 2, 10),
      (err) => err.message === 'Persistent 500 error'
    );
    assert.equal(callCount, 3); // initial + 2 retries
  });

  test('callGeminiUnderstand parses mock Gemini response correctly', async () => {
    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            situation_summary: 'Severe acute asthma exacerbation.',
            urgency_level: URGENCY_LEVELS.HIGH,
            extracted_facts: [
              { category: 'symptom', fact: 'Wheezing and difficulty speaking', source: 'voice transcript' }
            ],
            recommended_actions: [
              { action: 'Administer Salbutamol inhaler via spacer.', reason: 'Bronchodilation', time_sensitivity: 'Immediate' }
            ],
            call_108_script: 'Asthma attack. Patient unable to finish sentences.',
            missing_information: ['Peak flow reading'],
            confidence_score: 0.91
          })
        })
      }
    };

    const res = await callGeminiUnderstand({
      text: 'Patient having asthma attack',
      client: mockClient
    });

    assert.equal(res.urgency_level, URGENCY_LEVELS.HIGH);
    assert.equal(res.extracted_facts[0].category, 'symptom');
  });

  test('callGeminiUnderstand throws GeminiServiceError when upstream returns empty string', async () => {
    const mockClient = {
      models: {
        generateContent: async () => ({ text: '' })
      }
    };

    await assert.rejects(
      async () => callGeminiUnderstand({ text: 'Test', client: mockClient }),
      (err) => err instanceof GeminiServiceError && err.message.includes('empty response')
    );
  });
});
