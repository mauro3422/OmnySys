/**
 * File size analyzer (Molecular Semantic Algebra)
 * @module mcp/tools/suggest-refactoring/file-analyzer
 */

/**
 * Sugiere dividir archivos grandes basados en la Complejidad Molecular
 * @param {Array} atoms - Array of atoms
 * @param {string} filePath - File path filter
 * @returns {Array} - Array of suggestions
 */
import { normalizePath as canonicalNormalizePath } from '../../../../shared/utils/path-utils.js';
function normalizePath(filePath) {
  return canonicalNormalizePath(filePath);
}

function getFileBucket(byFile, path) {
  if (!byFile.has(path)) {
    byFile.set(path, { atoms: [], totalLOC: 0, totalComplexity: 0 });
  }

  return byFile.get(path);
}

function accumulateAtomMetrics(bucket, atom) {
  bucket.atoms.push(atom);

  const atomType = atom.archetype?.type || atom.type;
  // Si la clase ya es contabilizada en sí misma junto a todo su bloque interno,
  // evitamos sumar a sus clases-metodos otra vez para no duplicar la complejidad/LOC.
  if (atomType !== 'class-method' && atomType !== 'constructor') {
    bucket.totalLOC += atom.linesOfCode || atom.lines_of_code || 0;
    bucket.totalComplexity += atom.complexity || 0;
  }
}

function buildFileSplitSuggestion(file, data) {
  const byArchetype = new Map();
  for (const atom of data.atoms) {
    const arch = atom.archetype?.type || 'module';
    if (!byArchetype.has(arch)) byArchetype.set(arch, []);
    byArchetype.get(arch).push(atom);
  }

  const severity = (data.totalLOC > 600 || data.totalComplexity > 100) ? 'high' : 'medium';
  const archetypeSplitMsg = byArchetype.size >= 2
    ? `Consider splitting into ${byArchetype.size} modules by responsibility.`
    : `Consider breaking down this Monolithic File (God Object).`;

  return {
    type: 'split_file',
    severity,
    target: file,
    file: file,
    currentLOC: data.totalLOC,
    currentComplexity: data.totalComplexity,
    suggestion: `File is a God Object (LOC: ${data.totalLOC}, Complexity: ${data.totalComplexity}). ${archetypeSplitMsg}`,
    groupings: Array.from(byArchetype.entries()).map(([arch, archAtoms]) => ({
      archetype: arch,
      count: archAtoms.length,
      suggestedFile: `${file.replace('.js', '')}.${arch}.js`
    }))
  };
}

export function analyzeFileSize(atoms, filePath) {
  if (!Array.isArray(atoms) || atoms.length === 0) {
    return [];
  }

  const normalizedFilter = normalizePath(filePath);
  const byFile = new Map();

  for (const atom of atoms) {
    if (!atom.file_path && !atom.filePath) continue;
    const path = normalizePath(atom.filePath || atom.file_path);
    if (normalizedFilter && path !== normalizedFilter) continue;

    const current = getFileBucket(byFile, path);
    accumulateAtomMetrics(current, atom);
  }

  const suggestions = [];

  for (const [file, data] of byFile) {
    // Molecular rules: File is too big (>300 LOC) or too complex (> 50 total complexity)
    if (data.totalLOC > 300 || data.totalComplexity > 50) {
      suggestions.push(buildFileSplitSuggestion(file, data));
    }
  }

  return suggestions;
}
