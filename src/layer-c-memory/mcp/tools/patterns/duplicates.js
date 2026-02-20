/**
 * @fileoverview duplicates.js
 * Detecta código duplicado usando DNA structural hash y pattern hash
 */

/**
 * Encuentra código duplicado exacto y similar
 * @param {Array} atoms - Lista de átomos
 * @param {number} minOccurrences - Mínimo de ocurrencias para considerar duplicado
 * @returns {Object} Duplicados exactos y similares
 */
export function findDuplicates(atoms, minOccurrences) {
  const byStructuralHash = new Map();
  const byPatternHash = new Map();
  
  for (const atom of atoms) {
    const structHash = atom.dna?.structuralHash;
    const patternHash = atom.dna?.patternHash;
    
    if (structHash) {
      if (!byStructuralHash.has(structHash)) {
        byStructuralHash.set(structHash, []);
      }
      byStructuralHash.get(structHash).push(atom);
    }
    
    if (patternHash) {
      if (!byPatternHash.has(patternHash)) {
        byPatternHash.set(patternHash, []);
      }
      byPatternHash.get(patternHash).push(atom);
    }
  }
  
  const exactDuplicates = [];
  for (const [hash, atomsList] of byStructuralHash) {
    if (atomsList.length >= minOccurrences) {
      exactDuplicates.push({
        type: 'exact',
        hash,
        count: atomsList.length,
        similarity: 100,
        atoms: atomsList.slice(0, 8).map(a => ({
          id: a.id,
          name: a.name,
          file: a.filePath,
          line: a.line,
          complexity: a.complexity,
          linesOfCode: a.linesOfCode
        })),
        recommendation: `Extract to shared function. Potential savings: ${(atomsList.length - 1) * atomsList[0].linesOfCode} LOC`
      });
    }
  }
  
  const similarCode = [];
  for (const [hash, atomsList] of byPatternHash) {
    if (atomsList.length >= minOccurrences) {
      const existingExact = exactDuplicates.some(d => 
        d.atoms.some(a => atomsList.some(a2 => a.id === a2.id))
      );
      
      if (!existingExact && atomsList.length >= 2) {
        similarCode.push({
          type: 'similar',
          patternHash: hash,
          count: atomsList.length,
          similarity: 80,
          flowType: atomsList[0].dna?.flowType,
          operationSequence: atomsList[0].dna?.operationSequence?.slice(0, 10),
          atoms: atomsList.slice(0, 8).map(a => ({
            id: a.id,
            name: a.name,
            file: a.filePath,
            line: a.line,
            complexity: a.complexity,
            linesOfCode: a.linesOfCode,
            structuralHash: a.dna?.structuralHash
          })),
          recommendation: 'Similar structure detected. Consider refactoring if logic is duplicated.'
        });
      }
    }
  }
  
  return {
    exactDuplicates: exactDuplicates.sort((a, b) => b.count - a.count).slice(0, 10),
    similarCode: similarCode.sort((a, b) => b.count - a.count).slice(0, 10),
    summary: {
      exactDuplicatesFound: exactDuplicates.length,
      similarCodeFound: similarCode.length,
      potentialSavingsLOC: exactDuplicates.reduce((sum, d) => sum + (d.count - 1) * (d.atoms[0]?.linesOfCode || 0), 0)
    }
  };
}
