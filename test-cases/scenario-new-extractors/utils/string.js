/**
 * String utilities
 */

export function formatString(str) {
  return str.trim().toLowerCase();
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
