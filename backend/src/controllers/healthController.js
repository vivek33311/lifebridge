/**
 * @fileoverview Health check probe controller.
 * @module controllers/healthController
 */

/**
 * Handles health probe requests (GET /healthz).
 *
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 */
export function getHealthStatus(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'LifeBridge',
    timestamp: new Date().toISOString()
  });
}
