/**
 * @fileoverview String sanitization and prompt injection defense utilities.
 * @module utils/sanitize
 */

/**
 * Strips dangerous control characters and normalizes Unicode.
 * Preserves standard whitespace, Indian language scripts (Devanagari, etc.), and common punctuation.
 *
 * @param {string} input - Untrusted raw string.
 * @returns {string} Sanitized string.
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Normalize Unicode to canonical composition
    .normalize('NFKC')
    // Remove null bytes and non-printable control characters (keep \r, \n, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Neutralize prompt injection delimiter tags
    .replace(/<\/?user_raw_input>/gi, '')
    // Neutralize prompt injection system overrides or jailbreak phrases
    .replace(/<\/?system>/gi, '')
    .replace(/<\/?instructions>/gi, '')
    .trim();
}

/**
 * Escapes HTML characters for defense-in-depth output safety.
 *
 * @param {string} input - String to be escaped.
 * @returns {string} HTML-escaped string.
 */
export function escapeHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }

  const htmlMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return input.replace(/[&<>"']/g, (char) => htmlMap[char] || char);
}

/**
 * Wraps user input in strict XML-style delimiters and appends anti-injection instructions
 * for Gemini prompt construction.
 *
 * @param {string} rawText - User text after basic sanitization.
 * @returns {string} Prompt-safe tagged text block.
 */
export function formatPromptInput(rawText) {
  const sanitized = sanitizeText(rawText);
  return `<user_raw_input>\n${sanitized}\n</user_raw_input>`;
}
