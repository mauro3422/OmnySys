/**
 * File size analyzer
 * @module mcp/tools/suggest-refactoring/file-analyzer
 */

/**
 * Sugiere dividir archivos grandes
 * @param {Array} atoms - Array of atoms
 * @param {string} filePath - File path filter
 * @returns {Array} - Array of suggestions
 */
export function analyzeFileSize(atoms, filePath) {
  const byFile = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, { atoms: [], totalLOC: 0 });
    }
    byFile.get(atom.filePath).atoms.push(atom);
    byFile.get(atom.filePath).totalLOC += atom.linesOfCode || 0;
  }
  
  const suggestions = [];
  
  for (const [file, data] of byFile) {
    if (data.totalLOC > 300) {
      // Agrupar por arquetipo
      const byArchetype = new Map();
      for (const atom of data.atoms) {
        const arch = atom.archetype?.type || 'other';
        if (!byArchetype.has(arch)) byArchetype.set(arch, []);
        byArchetype.get(arch).push(atom);
      }
      
      if (byArchetype.size >= 2) {
        suggestions.push({
          type: 'split_file',
          severity: data.totalLOC > 500 ? 'high' : 'medium',
          target: file,
          currentLOC: data.totalLOC,
          suggestion: `Split file into ${byArchetype.size} modules by responsibility`,
          groupings: Array.from(byArchetype.entries()).map(([arch, atoms]) => ({
            archetype: arch,
            count: atoms.length,
            suggestedFile: `${file.replace('.js', '')}.${arch}.js`
          }))
        });
      }
    }
  }
  
  return suggestions;
}
