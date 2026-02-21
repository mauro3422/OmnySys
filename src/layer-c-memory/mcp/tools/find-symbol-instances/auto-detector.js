/**
 * Auto-detection utilities for finding duplicate symbols
 * @module layer-c-memory/mcp/tools/find-symbol-instances/auto-detector
 */

/**
 * Auto-detecta duplicados críticos en todo el proyecto
 * @param {Array} atoms - Array of all atoms
 * @param {number} minInstances - Minimum number of instances to consider
 * @returns {Array} - Array of duplicate groups sorted by risk
 */
export async function autoDetectDuplicates(atoms, minInstances = 2) {
  const byHash = new Map();
  
  for (const atom of atoms) {
    if (!atom.name || atom.name === 'anonymous') continue;
    if (atom.linesOfCode < 5) continue;
    
    const hash = atom.dna?.structuralHash;
    if (!hash) continue;
    
    if (!byHash.has(hash)) {
      byHash.set(hash, []);
    }
    byHash.get(hash).push(atom);
  }
  
  const duplicates = [];
  for (const [hash, atomsList] of byHash) {
    if (atomsList.length >= minInstances) {
      const totalUsage = atomsList.reduce((sum, a) => sum + (a.calledBy?.length || 0), 0);
      const maxComplexity = Math.max(...atomsList.map(a => a.complexity || 0));
      const totalLines = atomsList.reduce((sum, a) => sum + (a.linesOfCode || 0), 0);
      
      const riskScore = (totalUsage * 2) + (maxComplexity * 3) + (totalLines / 10);
      
      const canonical = atomsList.sort((a, b) => {
        const usageA = a.calledBy?.length || 0;
        const usageB = b.calledBy?.length || 0;
        if (usageB !== usageA) return usageB - usageA;
        if (a.filePath?.startsWith('src/') && !b.filePath?.startsWith('src/')) return -1;
        if (!a.filePath?.startsWith('src/') && b.filePath?.startsWith('src/')) return 1;
        return (a.complexity || 0) - (b.complexity || 0);
      })[0];
      
      const uniqueNames = [...new Set(atomsList.map(a => a.name))];
      const displayName = uniqueNames.length === 1 
        ? `"${uniqueNames[0]}"`
        : `${uniqueNames.length} funciones con código idéntico`;
      
      duplicates.push({
        hash: hash.slice(0, 16) + '...',
        symbolName: atomsList[0].name,
        allNames: uniqueNames,
        count: atomsList.length,
        riskScore: Math.round(riskScore),
        totalUsage,
        potentialSavings: (atomsList.length - 1) * (atomsList[0].linesOfCode || 0),
        linesOfCode: atomsList[0].linesOfCode,
        canonical: {
          file: canonical.filePath,
          line: canonical.line,
          usage: canonical.calledBy?.length || 0,
          name: canonical.name
        },
        instances: atomsList.map(a => ({
          file: a.filePath,
          line: a.line,
          name: a.name,
          usage: a.calledBy?.length || 0,
          complexity: a.complexity,
          isCanonical: a.id === canonical.id
        })).sort((a, b) => b.usage - a.usage),
        recommendation: atomsList.length > 2 
          ? `CRÍTICO: ${atomsList.length} copias idénticas (${uniqueNames.join(', ')}). Consolidar en ${canonical.filePath}`
          : `Duplicado: Código idéntico en ${atomsList.length} archivos (${uniqueNames.join(', ')}). Usar la versión de ${canonical.filePath}`
      });
    }
  }
  
  return duplicates.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
}
