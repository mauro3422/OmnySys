/**
 * @fileoverview dead-code.js
 * Detecta código potencialmente muerto (no usado)
 */

import { isTestCallback, isAnalysisScript, isDynamicallyUsed } from '../../core/analysis-checker/utils/script-classifier.js';

// Mantener funciones locales para backward compatibility
const localIsTestCallback = isTestCallback;
const localIsAnalysisScript = isAnalysisScript;
const localIsDynamicallyUsed = isDynamicallyUsed;

/**
 * Encuentra código potencialmente muerto
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Código potencialmente muerto
 */
/**
 * Encuentra código potencialmente muerto
 * @param {Array} atoms - Lista de átomos
 * @returns {Array} Código potencialmente muerto
 */
export function findDeadCode(atoms) {
  const dead = [];
  
  for (const atom of atoms) {
    // 🧪 FIX 1: Skip test callbacks (describe, it, etc.)
    if (localIsTestCallback(atom)) continue;
    
    // 🆕 FIX 1b: Skip analysis scripts
    if (localIsAnalysisScript(atom)) continue;
    
    // 🆕 FIX 1c: Skip if explicitly marked as not dead code
    const purpose = atom.purpose;
    if (purpose && purpose.isDeadCode === false) continue;
    
    // 🆕 FIX 1d: Skip entry points based on purpose type
    if (purpose && ['ENTRY_POINT', 'TEST_HELPER', 'WORKER_ENTRY'].includes(purpose.type)) continue;
    
    // Skip if it's exported (might be used externally)
    if (atom.isExported) continue;
    
    // Skip if it has callers
    if (atom.calledBy?.length > 0) continue;
    
    // 🎯 FIX 2: Skip entry points and special purposes
    if (['CLI_ENTRY', 'TEST_CALLBACK', 'SCRIPT_MAIN', 'PRIVATE_HELPER'].includes(atom.purpose)) continue;
    
    // 🔄 FIX 3: Skip dynamically used exports (CLI commands, scripts)
    if (localIsDynamicallyUsed(atom)) continue;
    
    // Skip if it's an event handler (might be called dynamically)
    if (atom.name?.startsWith('on') || atom.name?.startsWith('handle')) continue;
    
    // 🆕 FIX 4: Skip coverage reports
    if (atom.filePath?.includes('coverage/')) continue;
    
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
