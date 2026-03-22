/**
 * @fileoverview Shared regex helpers.
 *
 * @module shared/utils/regex-utils
 */

export function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
