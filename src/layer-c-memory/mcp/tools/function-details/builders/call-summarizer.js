/**
 * @fileoverview Call Summarizer - Resume llamadas de funciones
 */

/**
 * Resume las llamadas de una función
 * @param {Array} calls - Array de llamadas
 * @returns {Array} - Llamadas resumidas y agrupadas
 */
export function summarizeCalls(calls) {
  if (!calls || calls.length === 0) return [];

  const grouped = {};
  for (const call of calls) {
    const key = call.name || call.callee || 'unknown';
    if (!grouped[key]) {
      grouped[key] = { name: key, count: 0, type: call.type, lines: [] };
    }
    grouped[key].count++;
    if (call.line) grouped[key].lines.push(call.line);
  }

  return Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
