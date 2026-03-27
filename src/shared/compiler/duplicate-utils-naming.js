/**
 * @fileoverview Naming helpers for duplicate coordination.
 *
 * @module shared/compiler/duplicate-utils-naming
 */

/**
 * Genera nombres alternativos para evitar colisiones de duplicados.
 *
 * @param {string} originalName
 * @param {string|null} [existingName]
 * @returns {string[]}
 */
export function generateAlternativeNames(originalName, existingName = null) {
  const alternatives = [];

  if (existingName) {
    alternatives.push(`Reuse ${existingName}`);

    const reusePrefixes = ['create', 'build', 'compute', 'generate', 'make'];
    const lowerName = originalName.toLowerCase();

    for (const prefix of reusePrefixes) {
      if (lowerName.startsWith(prefix)) {
        alternatives.push(`${prefix}Specific${originalName.slice(prefix.length)}`);
        break;
      }
    }

    alternatives.push(`Merge with ${existingName}`);
  }

  const suffixes = ['New', 'V2', 'Ext', 'Impl', 'Async'];
  for (const suffix of suffixes) {
    alternatives.push(`${originalName}${suffix}`);
  }

  const renamePrefixes = ['fetch', 'load', 'build', 'compute', 'process'];
  const lowerName = originalName.toLowerCase();

  for (const prefix of renamePrefixes) {
    if (!lowerName.startsWith(prefix)) continue;

    const rest = originalName.slice(prefix.length);
    for (const altPrefix of renamePrefixes.filter((candidate) => candidate !== prefix).slice(0, 2)) {
      alternatives.push(`${altPrefix}${rest}`);
    }
    break;
  }

  return [...new Set(alternatives)].slice(0, 6);
}
