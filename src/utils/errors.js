/**
 * @fileoverview Custom error hierarchy and error response formatting.
 * @module utils/errors
 */

/**
 * Base Application Error class.
 * @extends Error
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} [statusCode=500] - HTTP status code.
   * @param {string} [code='INTERNAL_ERROR'] - Machine-readable error code.
   * @param {Record<string, unknown>|null} [details=null] - Additional metadata.
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when client input fails schema validation.
 * @extends AppError
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Validation failure message.
   * @param {Record<string, unknown>|null} [details=null] - Schema issue details.
   */
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Thrown when upstream Gemini API invocation fails or times out.
 * @extends AppError
 */
export class GeminiServiceError extends AppError {
  /**
   * @param {string} message - Upstream service error message.
   * @param {Record<string, unknown>|null} [details=null] - Diagnostic information.
   */
  constructor(message, details = null) {
    super(message, 502, 'GEMINI_SERVICE_ERROR', details);
  }
}

/**
 * Formats any caught error into a safe, structured API response.
 * Strips stack traces in production to prevent information disclosure.
 *
 * @param {Error|AppError} err - Caught error instance.
 * @param {string} [environment=process.env.NODE_ENV] - Current runtime environment.
 * @returns {{ error: { code: string, message: string, details?: unknown, stack?: string } }}
 */
export function formatErrorResponse(err, environment = process.env.NODE_ENV) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred while processing the request.';

  const response = {
    error: {
      code,
      message,
      ...(isAppError && err.details ? { details: err.details } : {})
    }
  };

  if (environment !== 'production' && err.stack) {
    response.error.stack = err.stack;
  }

  return { statusCode, body: response };
}
