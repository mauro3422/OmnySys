/**
 * @fileoverview duplicates.js
 * Detecta código duplicado usando DNA hashes jerárquicos
 * 
 * Niveles de detección:
 * - semanticHash: Duplicados exactos (estructura + contexto + semántica)
 * - contextualHash: Duplicados contextuales (estructura + contexto)
 * - structuralHash: Patrones estructurales similares
 * 
 * Filtra por duplicabilityScore para excluir falsos positivos
 * (test callbacks, getters/setters, polimorfismo legítimo)
 */

// Score mínimo para considerar un duplicado "real"
const MIN_DUPLICABILITY_SCORE = 50;

/**
 * Encuentra código duplicado exacto y similar
 * @param {Array} atoms - Lista de átomos
 * @param {number} minOccurrences - Mínimo de ocurrencias para considerar duplicado
 * @returns {Object} Duplicados exactos y similares
 */
export function findDuplicates(atoms, minOccurrences) {
  // Filtrar átomos con baja duplicabilidad (falsos positivos)
  const eligibleAtoms = atoms.filter(atom => {
    const score = atom.dna?.duplicabilityScore ?? 100;
    return score >= MIN_DUPLICABILITY_SCORE;
  });

  const bySemanticHash = new Map();
  const byContextualHash = new Map();
  const byStructuralHash = new Map();
  
  for (const atom of eligibleAtoms) {
    const semanticHash = atom.dna?.semanticHash;
    const contextualHash = atom.dna?.contextualHash;
    const structuralHash = atom.dna?.structuralHash;
    
    if (semanticHash) {
      if (!bySemanticHash.has(semanticHash)) {
        bySemanticHash.set(semanticHash, []);
      }
      bySemanticHash.get(semanticHash).push(atom);
    }
    
    if (contextualHash) {
      if (!byContextualHash.has(contextualHash)) {
        byContextualHash.set(contextualHash, []);
      }
      byContextualHash.get(contextualHash).push(atom);
    }

    if (structuralHash) {
      if (!byStructuralHash.has(structuralHash)) {
        byStructuralHash.set(structuralHash, []);
      }
      byStructuralHash.get(structuralHash).push(atom);
    }
  }
  
  // Nivel 1: Duplicados exactos (semanticHash)
  const exactDuplicates = [];
  for (const [hash, atomsList] of bySemanticHash) {
    if (atomsList.length >= minOccurrences) {
      exactDuplicates.push({
        type: 'exact',
        hash,
        hashType: 'semantic',
        count: atomsList.length,
        similarity: 100,
        avgDuplicabilityScore: Math.round(
          atomsList.reduce((sum, a) => sum + (a.dna?.duplicabilityScore || 0), 0) / atomsList.length
        ),
        atoms: atomsList.slice(0, 8).map(a => ({
          id: a.id,
          name: a.name,
          file: a.filePath,
          line: a.line,
          complexity: a.complexity,
          linesOfCode: a.linesOfCode,
          duplicabilityScore: a.dna?.duplicabilityScore
        })),
        recommendation: `Extract to shared function. Potential savings: ${(atomsList.length - 1) * atomsList[0].linesOfCode} LOC`,
        isLegitimateDuplicate: true
      });
    }
  }

  // Nivel 2: Duplicados contextuales (contextualHash) - excluir ya encontrados
  const contextualDuplicates = [];
  for (const [hash, atomsList] of byContextualHash) {
    if (atomsList.length >= minOccurrences) {
      // Verificar que no esté ya en duplicados exactos
      const alreadyExact = atomsList.every(atom => 
        exactDuplicates.some(d => d.atoms.some(a => a.id === atom.id))
      );
      
      if (!alreadyExact) {
        contextualDuplicates.push({
          type: 'contextual',
          hash,
          hashType: 'contextual',
          count: atomsList.length,
          similarity: 90,
          avgDuplicabilityScore: Math.round(
            atomsList.reduce((sum, a) => sum + (a.dna?.duplicabilityScore || 0), 0) / atomsList.length
          ),
          atoms: atomsList.slice(0, 8).map(a => ({
            id: a.id,
            name: a.name,
            file: a.filePath,
            line: a.line,
            complexity: a.complexity,
            linesOfCode: a.linesOfCode,
            duplicabilityScore: a.dna?.duplicabilityScore
          })),
          recommendation: 'Similar logic in different contexts. Review if abstraction is appropriate.',
          isLegitimateDuplicate: true
        });
      }
    }
  }
  
  // Nivel 3: Patrones estructurales (structuralHash) - baja prioridad
  const structuralPatterns = [];
  for (const [hash, atomsList] of byStructuralHash) {
    if (atomsList.length >= minOccurrences) {
      // Verificar que no esté en niveles superiores
      const alreadyFound = atomsList.every(atom => 
        exactDuplicates.some(d => d.atoms.some(a => a.id === atom.id)) ||
        contextualDuplicates.some(d => d.atoms.some(a => a.id === atom.id))
      );
      
      if (!alreadyFound && atomsList.length >= 3) { // Requerir más ocurrencias para patrones
        structuralPatterns.push({
          type: 'structural-pattern',
          hash,
          hashType: 'structural',
          count: atomsList.length,
          similarity: 70,
          flowType: atomsList[0].dna?.flowType,
          operationSequence: atomsList[0].dna?.operationSequence?.slice(0, 10),
          atoms: atomsList.slice(0, 5).map(a => ({
            id: a.id,
            name: a.name,
            file: a.filePath,
            line: a.line,
            complexity: a.complexity,
            linesOfCode: a.linesOfCode,
            archetype: a.archetype?.type,
            purpose: a.purpose
          })),
          recommendation: 'Common structural pattern detected. May be legitimate (polymorphism, framework patterns).',
          isLegitimateDuplicate: false
        });
      }
    }
  }
  
  // Combinar resultados: exactos primero, luego contextuales, luego patrones
  const allDuplicates = [
    ...exactDuplicates,
    ...contextualDuplicates
  ].sort((a, b) => b.count - a.count);

  // Calcular ahorros reales (solo duplicados legítimos)
  const legitimateDuplicates = allDuplicates.filter(d => d.isLegitimateDuplicate);
  const potentialSavingsLOC = legitimateDuplicates.reduce((sum, d) => {
    const avgLines = d.atoms.reduce((s, a) => s + (a.linesOfCode || 0), 0) / d.atoms.length;
    return sum + (d.count - 1) * avgLines;
  }, 0);
  
  return {
    exactDuplicates: exactDuplicates.slice(0, 10),
    contextualDuplicates: contextualDuplicates.slice(0, 10),
    structuralPatterns: structuralPatterns.slice(0, 5),
    summary: {
      exactDuplicatesFound: exactDuplicates.length,
      contextualDuplicatesFound: contextualDuplicates.length,
      structuralPatternsFound: structuralPatterns.length,
      atomsExcluded: atoms.length - eligibleAtoms.length,
      potentialSavingsLOC: Math.round(potentialSavingsLOC),
      avgDuplicabilityScore: eligibleAtoms.length > 0
        ? Math.round(eligibleAtoms.reduce((sum, a) => sum + (a.dna?.duplicabilityScore || 0), 0) / eligibleAtoms.length)
        : 0
    }
  };
}
