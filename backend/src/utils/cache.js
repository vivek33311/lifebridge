/**
 * @fileoverview Fast in-memory LRU cache with TTL to deduplicate emergency analysis requests.
 * @module utils/cache
 */

import crypto from 'node:crypto';
import { CACHE_CONFIG } from '../config/constants.js';

/**
 * Entry holding cached value and expiry timestamp.
 * @typedef {Object} CacheEntry
 * @property {unknown} value
 * @property {number} expiresAt
 */

export class LruTtlCache {
  /**
   * @param {number} [maxSize=CACHE_CONFIG.MAX_ITEMS] - Maximum items before eviction.
   * @param {number} [ttlMs=CACHE_CONFIG.TTL_MS] - Time-to-live in milliseconds.
   */
  constructor(maxSize = CACHE_CONFIG.MAX_ITEMS, ttlMs = CACHE_CONFIG.TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    /** @type {Map<string, CacheEntry>} */
    this.cache = new Map();
  }

  /**
   * Generates a deterministic SHA-256 fingerprint for a request payload.
   *
   * @param {{ text?: string, image?: { data?: string, mimeType?: string } }} payload
   * @returns {string} Hexadecimal hash key.
   */
  static hashPayload(payload) {
    const hash = crypto.createHash('sha256');
    hash.update(payload.text || '');
    if (payload.image?.data) {
      hash.update(payload.image.mimeType || '');
      // Hash a prefix and suffix of base64 to avoid copying 4MB buffer while preserving uniqueness
      const imgLen = payload.image.data.length;
      hash.update(String(imgLen));
      hash.update(payload.image.data.slice(0, 1024));
      hash.update(payload.image.data.slice(-1024));
    }
    return hash.digest('hex');
  }

  /**
   * Retrieves an item from the cache. Refreshes LRU position if found and valid.
   *
   * @param {string} key - Cache key.
   * @returns {unknown|null} Cached value or null if expired/absent.
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order: delete and re-insert
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Stores an item in the cache, evicting the least-recently used entry if needed.
   *
   * @param {string} key - Cache key.
   * @param {unknown} value - Value to store.
   * @param {number} [customTtlMs] - Optional custom TTL.
   */
  set(key, value, customTtlMs) {
    const ttl = customTtlMs ?? this.ttlMs;
    const expiresAt = Date.now() + ttl;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first inserted) item
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Clears all items from the cache.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Returns current count of entries in the cache.
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}

/**
 * Global singleton instance for the analyze route.
 * @type {LruTtlCache}
 */
export const analyzeCache = new LruTtlCache();
