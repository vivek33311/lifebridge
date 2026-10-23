/**
 * @fileoverview Integration tests for Express routes (/api/analyze, /healthz, rate limits, error formats).
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import test, { describe, before, after } from 'node:test';
import { app } from '../src/server.js';
import { analyzeCache } from '../src/utils/cache.js';

describe('API Route Integration & Hardened Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    analyzeCache.clear();
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    analyzeCache.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /healthz returns 200 with service health status', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.service, 'LifeBridge');
    assert.ok(json.timestamp);
  });

  test('POST /api/analyze returns 400 VALIDATION_ERROR for empty payload', async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', image: undefined })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, 'VALIDATION_ERROR');
    assert.ok(json.error.details.issues.length > 0);
  });

  test('POST /api/analyze returns 400 for disallowed image MIME type', async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Patient photo',
        image: {
          data: 'SGVsbG8=',
          mimeType: 'application/pdf'
        }
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/analyze returns deterministic fallback with X-Fallback when Gemini fails or is offline', async () => {
    // When GEMINI_API_KEY is not set or invalid in test env, it triggers fallback
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Papa ko chest pain ho raha hai aur bahut paseena aa raha hai'
      })
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-fallback'), 'true');
    const json = await res.json();
    assert.equal(json.urgency_level, 'CRITICAL');
    assert.ok(json.call_108_script.includes('108'));
    assert.ok(json.recommended_actions.length > 0);
  });

  test('POST /api/analyze caches results and returns X-Cache: HIT on duplicate request', async () => {
    const payload = { text: 'Child with allergic hives after peanut exposure' };

    // First request (MISS)
    const res1 = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('x-cache'), 'MISS');

    // Second identical request (HIT)
    const res2 = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('x-cache'), 'HIT');
  });

  test('POST /api/unknown returns 404 with structured error', async () => {
    const res = await fetch(`${baseUrl}/api/non_existent_route`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, 'NOT_FOUND');
  });

  test('Response includes RateLimit headers from express-rate-limit', async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Testing rate limit headers' })
    });

    assert.ok(res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit'));
  });

  test('Security headers (CSP, X-Content-Type-Options) are applied by Helmet', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('content-security-policy'));
  });
});
