/**
 * @fileoverview purpose-enricher.js
 * 
 * Enriquece los propósitos de los átomos para detectar correctamente:
 * - Entry points (main, execute, run, etc.)
 * - Test helpers (no callbacks pero parte de tests)
 * - Scripts de análisis
 * - Workers y procesos
 * 
 * @module layer-a-static/pipeline/phases/atom-extraction/metadata/purpose-enricher
 */

/**
 * Detecta si una función es un entry point basado en múltiples señales
 * @param {Object} atom - Átomo a analizar
 * @returns {boolean}
 */
export function isEntryPoint(atom) {
  if (!atom || !atom.name) return false;
  
  const name = atom.name.toLowerCase();
  const filePath = atom.filePath?.toLowerCase() || '';
  
  // 1. Nombres típicos de entry points
  const entryPointNames = ['main', 'execute', 'run', 'start', 'cli', 'bootstrap'];
  const isEntryPointName = entryPointNames.includes(name);
  
  if (!isEntryPointName) return false;
  
  // 2. Contexto: ¿está en un archivo que se ejecuta directamente?
  
  // CLI commands
  if (filePath.includes('src/cli/')) {
    return true;
  }
  
  // Scripts ejecutables
  if (filePath.includes('scripts/')) {
    return true;
  }
  
  // Workers
  if (filePath.includes('worker') || filePath.includes('-worker.')) {
    return true;
  }
  
  // Entry points de aplicación
  if (filePath.includes('index.js') || filePath.includes('main.js')) {
    return true;
  }
  
  // Tests funcionales (main de test)
  if (filePath.includes('test') && (filePath.endsWith('.test.js') || filePath.endsWith('.spec.js'))) {
    return true;
  }
  
  // Archivos que no son librerías (no están en src/ como tal)
  if (!filePath.includes('src/') && filePath.endsWith('.js')) {
    return true;
  }
  
  // Archivos en raíz del proyecto (install.js, run.js, etc.)
  if (!filePath.includes('/') && filePath.endsWith('.js')) {
    return true;
  }
  
  return false;
}

/**
 * Detecta si es un test helper (no es callback pero es parte del test)
 * @param {Object} atom - Átomo a analizar
 * @returns {boolean}
 */
export function isTestHelper(atom) {
  if (!atom || !atom.filePath) return false;
  
  const filePath = atom.filePath.toLowerCase();
  
  // Es archivo de test
  const isTestFile = filePath.includes('.test.') || 
                     filePath.includes('.spec.') ||
                     filePath.includes('/test/') ||
                     filePath.includes('/tests/') ||
                     filePath.includes('/__tests__/');
  
  if (!isTestFile) return false;
  
  // No es un callback de test framework (describe, it, etc.)
  const testCallbackNames = ['describe', 'it', 'test', 'before', 'after', 'beforeeach', 'aftereach'];
  const name = atom.name?.toLowerCase() || '';
  
  if (testCallbackNames.some(tc => name.startsWith(tc))) {
    return false; // Es un callback, no un helper
  }
  
  return true;
}

/**
 * Detecta si es un worker o proceso independiente
 * @param {Object} atom - Átomo a analizar
 * @returns {boolean}
 */
export function isWorkerOrProcess(atom) {
  if (!atom || !atom.filePath) return false;
  
  const filePath = atom.filePath.toLowerCase();
  const name = atom.name?.toLowerCase() || '';
  
  // Archivos worker
  if (filePath.includes('worker')) {
    return true;
  }
  
  // Funciones main en workers
  if (name === 'main' && filePath.includes('worker')) {
    return true;
  }
  
  // Procesos hijo
  if (filePath.includes('process') || filePath.includes('spawn')) {
    return true;
  }
  
  return false;
}

/**
 * Enriquece el propósito de un átomo
 * @param {Object} atom - Átomo a enriquecer
 * @returns {Object} Propósito enriquecido
 */
export function enrichPurpose(atom) {
  const currentPurpose = atom.purpose;
  
  // Si ya es un entry point reconocido, mantenerlo
  if (['CLI_ENTRY', 'API_EXPORT', 'SCRIPT_MAIN'].includes(currentPurpose?.type || currentPurpose)) {
    return currentPurpose;
  }
  
  // Detectar entry points
  if (isEntryPoint(atom)) {
    return {
      type: 'ENTRY_POINT',
      reason: 'Function is an entry point (main/execute/run in executable context)',
      confidence: 0.95,
      isDeadCode: false
    };
  }
  
  // Detectar test helpers
  if (isTestHelper(atom)) {
    return {
      type: 'TEST_HELPER',
      reason: 'Helper function in test file',
      confidence: 0.9,
      isDeadCode: false
    };
  }
  
  // Detectar workers
  if (isWorkerOrProcess(atom)) {
    return {
      type: 'WORKER_ENTRY',
      reason: 'Worker or process entry point',
      confidence: 0.95,
      isDeadCode: false
    };
  }
  
  // Mantener propósito actual si existe
  return currentPurpose;
}

/**
 * Enriquece el archetype de un átomo para evitar falsos dead-function
 * @param {Object} atom - Átomo a enriquecer
 * @returns {Object} Archetype corregido
 */
export function enrichArchetype(atom) {
  const currentArchetype = atom.archetype;
  
  // Si no es dead-function, mantenerlo
  if (currentArchetype?.type !== 'dead-function') {
    return currentArchetype;
  }
  
  // Si es entry point, cambiar a initializer u orchestrator
  if (isEntryPoint(atom) || isWorkerOrProcess(atom)) {
    return {
      type: 'initializer',
      severity: 3,
      confidence: 0.9
    };
  }
  
  // Si es test helper, cambiar a utility
  if (isTestHelper(atom)) {
    return {
      type: 'private-utility',
      severity: 2,
      confidence: 0.85
    };
  }
  
  return currentArchetype;
}

/**
 * Procesa un átomo y enriquece sus metadatos
 * @param {Object} atom - Átomo a procesar
 * @returns {Object} Átomo con metadatos enriquecidos
 */
export function enrichAtom(atom) {
  return {
    ...atom,
    purpose: enrichPurpose(atom),
    archetype: enrichArchetype(atom)
  };
}
