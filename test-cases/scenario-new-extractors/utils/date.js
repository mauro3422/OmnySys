/**
 * Date utilities
 */

export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
