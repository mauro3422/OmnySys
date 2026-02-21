/**
 * @fileoverview dead-code.js
 * Detecta código potencialmente muerto (no usado)
 */

/**
 * Encuentra código potencialmente muerto
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Código potencialmente muerto
 */
export function findDeadCode(atoms) {
  const dead = [];
  
  for (const atom of atoms) {
    // Skip if it's exported (might be used externally)
    if (atom.isExported) continue;
    
    // Skip if it has callers
    if (atom.calledBy?.length > 0) continue;
    
    // Skip entry points and special purposes
    if (['CLI_ENTRY', 'TEST_CALLBACK', 'SCRIPT_MAIN', 'PRIVATE_HELPER'].includes(atom.purpose)) continue;
    
    // Skip if it's an event handler (might be called dynamically)
    if (atom.name?.startsWith('on') || atom.name?.startsWith('handle')) continue;
    
    dead.push({
      id: atom.id,
      name: atom.name,
      file: atom.filePath,
      line: atom.line,
      complexity: atom.complexity,
      linesOfCode: atom.linesOfCode,
      reason: 'Not called by any other function and not exported',
      confidence: atom.purpose === 'DEAD_CODE' ? 'high' : 'medium'
    });
  }
  
  return dead.sort((a, b) => (b.linesOfCode || 0) - (a.linesOfCode || 0));
}
