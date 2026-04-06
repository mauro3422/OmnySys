/**
 * @fileoverview Shared normalization helpers — SSOT for tiny pure utilities
 * that were previously copy-pasted across compiler and layer-c modules.
 */

import { normalizeFolderizationPath } from '#shared/compiler/directory-structure-folderization-data.js';

// ── Key normalization ──────────────────────────────────────────────

/**
 * Normalize a key value to a trimmed string.
 * Returns empty string when value is nullish.
 */
export function normalizeKey(value) {
  return String(value || '').trim();
}

/**
 * Normalize a key value to a trimmed lowercase string.
 */
export function normalizeKeyLower(value) {
  return String(value || '').trim().toLowerCase();
}

// ── Score clamping ─────────────────────────────────────────────────

/**
 * Clamp a numeric score to [min, max].
 */
export function clampScore(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

// ── Text normalization ─────────────────────────────────────────────

/**
 * Return trimmed text or fallback when empty/null.
 */
export function normalizeText(value, fallback = null) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

// ── Date/day normalization ─────────────────────────────────────────

/**
 * Extract YYYY-MM-DD from an ISO date string.
 */
export function normalizeCapturedDay(capturedAt = new Date().toISOString()) {
  return String(capturedAt || new Date().toISOString()).slice(0, 10);
}

// ── Path normalization ─────────────────────────────────────────────

/**
 * Normalize a folderization/snapshot path via the canonical normalizer.
 */
export function normalizeSnapshotPath(value = '') {
  const normalized = normalizeFolderizationPath(value);
  return normalized || null;
}

// ── SQLite error classification ─────────────────────────────────────

/**
 * Detect transient SQLite availability errors (busy/locked).
 */
export function isTransientSqliteAvailabilityError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
    message.includes('database connection is not open') ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}

// ── History artifact preservation ────────────────────────────────────

/**
 * Check if a file name is a history DB artifact that should be preserved.
 */
export function shouldPreserveHistoryArtifact(fileName) {
  const name = String(fileName || '');
  return (
    name === 'health-history.db' ||
    name.startsWith('health-history.db-') ||
    name.startsWith('health-history.db.') ||
    name === 'atom-history.db' ||
    name.startsWith('atom-history.db-') ||
    name.startsWith('atom-history.db.')
  );
}

// ── JSON resource wrapper ──────────────────────────────────────────

/**
 * Wrap a payload as a JSON resource object (MCP ReadResource format).
 */
export function asJsonResource(uri, payload, meta = {}) {
  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(payload, null, 2),
    _meta: meta
  };
}

// ── Time helpers ─────────────────────────────────────────────────────

/**
 * Return the current time as an ISO 8601 string.
 */
export function nowIso() {
  return new Date().toISOString();
}

// ── Regex helpers ────────────────────────────────────────────────────

/**
 * Escape special regex characters in a string.
 */
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Path helpers ─────────────────────────────────────────────────────

/**
 * Normalize file path separators to forward slashes.
 * @param {string} filePath
 * @param {object} [opts]
 * @param {boolean} [opts.lowercase] - Also convert to lowercase
 */
export function normalizeFilePath(filePath = '', opts = {}) {
  let result = String(filePath || '').replace(/\\/g, '/');
  if (opts.lowercase) {
    result = result.toLowerCase();
  }
  return result;
}
