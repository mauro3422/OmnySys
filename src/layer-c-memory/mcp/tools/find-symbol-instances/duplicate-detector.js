/**
 * Duplicate detection utilities
 * @module layer-c-memory/mcp/tools/find-symbol-instances/duplicate-detector
 */

/**
 * Detecta si hay duplicados exactos o similares entre instancias
 * @param {Array} instances - Array of instances
 * @returns {Array} - Array of duplicate groups
 */
export function detectDuplicates(instances) {
  const hashes = new Map();
  const duplicates = [];
  
  for (const instance of instances) {
    const hash = instance.dna?.structuralHash;
    if (!hash) continue;
    
    if (!hashes.has(hash)) {
      hashes.set(hash, []);
    }
    hashes.get(hash).push(instance);
  }
  
  for (const [hash, atoms] of hashes) {
    if (atoms.length > 1) {
      duplicates.push({
        hash,
        count: atoms.length,
        instances: atoms.map(a => ({
          file: a.filePath,
          line: a.line,
          complexity: a.complexity,
          linesOfCode: a.linesOfCode
        }))
      });
    }
  }
  
  return duplicates;
}
