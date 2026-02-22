/**
 * @fileoverview script-classifier.js
 * 
 * Clasificador inteligente de scripts para determinar si son:
 * - Runtime crítico (debe analizarse para races/bugs)
 * - Scripts de análisis/utilidad (pueden ignorarse)
 * - Tests (ya se filtran por otro lado)
 * 
 * Usa múltiples heurísticas: path, purpose, archetype, nombre
 * 
 * @module mcp/core/analysis-checker/utils/script-classifier
 */

/**
 * Determina si un átomo es un script de análisis/utilidad (no runtime crítico)
 * @param {Object} atom - Átomo a clasificar
 * @returns {boolean} true si es script de análisis/utilidad
 */
export function isAnalysisScript(atom) {
  if (!atom) return false;
  
  // 1. Verificar por path - scripts de análisis/migración/audit
  if (atom.filePath) {
    const path = atom.filePath.toLowerCase();
    
    // Está en directorio scripts/
    if (path.includes('scripts/')) {
      // Nombres típicos de scripts de análisis
      const analysisPatterns = [
        /scripts\/[a-z-]*(?:analyze|audit|validate|check|inspect|review|scan|detect|find|search|extract|enrich|migrate|demo|debug|test|benchmark)/,
        /scripts\/(?:cleanup|purge|clear|reset|init-setup)/,
      ];
      
      if (analysisPatterns.some(pattern => pattern.test(path))) {
        return true;
      }
    }
    
    // Coverage reports (generados)
    if (path.includes('coverage/') || path.includes('lcov-report/')) {
      return true;
    }
  }
  
  // 2. Verificar por purpose
  if (atom.purpose) {
    const purpose = typeof atom.purpose === 'string' 
      ? atom.purpose 
      : atom.purpose?.type;
    
    if (['ANALYSIS_SCRIPT', 'SCRIPT_MAIN', 'MIGRATION_SCRIPT'].includes(purpose)) {
      return true;
    }
  }
  
  // 3. Verificar por archetype
  if (atom.archetype?.type === 'script') {
    return true;
  }
  
  // 4. Verificar por nombre de función
  if (atom.name) {
    const name = atom.name.toLowerCase();
    
    // Funciones típicas de scripts de análisis
    if (/^(analyze|audit|validate|check|inspect|scan|detect|find|search|extract|enrich|migrate|demo|debug)/.test(name)) {
      // Pero solo si está en un archivo de script
      if (atom.filePath?.includes('scripts/')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Determina si un export es usado dinámicamente (CLI, scripts, etc.)
 * @param {Object} atom - Átomo a verificar
 * @returns {boolean} true si es usado dinámicamente
 */
export function isDynamicallyUsed(atom) {
  if (!atom) return false;
  
  // 1. CLI commands - se cargan dinámicamente
  if (atom.filePath?.includes('src/cli/commands')) {
    return true;
  }
  
  // 2. CLI utils
  if (atom.filePath?.includes('src/cli/utils')) {
    return true;
  }
  
  // 3. Scripts con funciones main/execute/run
  if (['main', 'execute', 'run', 'start', 'cli'].includes(atom.name) && 
      atom.filePath?.includes('scripts/')) {
    return true;
  }
  
  // 4. Entry points
  if (['CLI_ENTRY', 'SCRIPT_MAIN', 'API_EXPORT'].includes(atom.purpose?.type || atom.purpose)) {
    return true;
  }
  
  // 5. Re-exports
  const purpose = atom.purpose?.type || atom.purpose;
  if (purpose && (purpose.includes('RE_EXPORT') || purpose.includes('RE-EXPORT'))) {
    return true;
  }
  
  return false;
}

/**
 * Determina si es un callback de test (describe, it, etc.)
 * @param {Object} atom - Átomo a verificar  
 * @returns {boolean} true si es callback de test
 */
export function isTestCallback(atom) {
  if (!atom) return false;
  
  // Flag explícito
  if (atom.isTestCallback || atom.testCallbackType) {
    return true;
  }
  
  // Nombres típicos de test
  const testPatterns = [
    /^describe\(/,
    /^it\(/,
    /^test\(/,
    /^before/,
    /^after/,
    /^beforeEach/,
    /^afterEach/
  ];
  
  if (atom.name && testPatterns.some(pattern => pattern.test(atom.name))) {
    return true;
  }
  
  // Archivos de test
  if (atom.filePath) {
    const path = atom.filePath.toLowerCase();
    if (path.includes('.test.') || 
        path.includes('.spec.') ||
        path.includes('/test/') ||
        path.includes('/tests/') ||
        path.includes('/__tests__/')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Clasificación completa de un átomo
 * @param {Object} atom - Átomo a clasificar
 * @returns {Object} Clasificación completa
 */
export function classifyAtom(atom) {
  return {
    isTest: isTestCallback(atom),
    isAnalysisScript: isAnalysisScript(atom),
    isDynamicallyUsed: isDynamicallyUsed(atom),
    shouldAnalyzeForRaces: !isTestCallback(atom) && !isAnalysisScript(atom),
    shouldCheckForDeadCode: !isTestCallback(atom) && !isAnalysisScript(atom),
    shouldCheckUnusedExport: !isDynamicallyUsed(atom)
  };
}
