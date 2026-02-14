/**
 * Confidence Filter
 */

/**
 * Filtra conexiones por confidence
 * @param {array} connections - Array de conexiones
 * @param {number} minConfidence - Confidence mínima
 * @returns {object} - { filtered: array, removed: array }
 */
export function filterByConfidence(connections, minConfidence = 0.7) {
  const filtered = [];
  const removed = [];

  for (const conn of connections) {
    if (conn.confidence >= minConfidence) {
      filtered.push(conn);
    } else {
      removed.push(conn);
    }
  }

  return { filtered, removed };
}
