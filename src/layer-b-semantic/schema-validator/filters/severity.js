/**
 * Severity Filter
 */

/**
 * Filtra conexiones por severity
 * @param {array} connections - Array de conexiones
 * @param {array} allowedSeverities - Severities permitidas
 * @returns {object} - { filtered: array, removed: array }
 */
export function filterBySeverity(connections, allowedSeverities = ['high', 'critical']) {
  const filtered = [];
  const removed = [];

  for (const conn of connections) {
    const severity = conn.severity || 'medium';
    if (allowedSeverities.includes(severity)) {
      filtered.push(conn);
    } else {
      removed.push(conn);
    }
  }

  return { filtered, removed };
}
