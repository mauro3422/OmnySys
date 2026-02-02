/**
 * Helpers - Utilidades compartidas
 *
 * Responsabilidad:
 * - Proveer funciones auxiliares usadas en múltiples análisis
 */

/**
 * Determina si un archivo es probablemente entry point
 *
 * @param {string} filePath - Ruta del archivo
 * @returns {boolean} - True si parece ser un entry point
 */
export function isLikelyEntryPoint(filePath) {
  const entryNames = ['index', 'main', 'app', 'cli', 'server', 'start'];
  const fileName = filePath.split('/').pop().toLowerCase();
  return entryNames.some(name => fileName.includes(name));
}

/**
 * Determina si un export es parte de la API pública
 *
 * Heurísticas:
 * 1. Archivo es un módulo principal del sistema (no subdirectorios internos)
 * 2. Nombre de función indica API genérica (build, parse, resolve, get, etc.)
 * 3. NO está en analyses/*, utils/*, helpers/*
 *
 * @param {string} filePath - Path del archivo
 * @param {string} exportName - Nombre del export
 * @returns {boolean} - True si es API pública
 */
export function isPublicAPI(filePath, exportName) {
  // 1. Archivos que son módulos principales del sistema
  const mainModules = [
    'indexer.js',
    'graph-builder.js',
    'parser.js',
    'resolver.js',
    'scanner.js',
    'analyzer.js'
  ];

  const isMainModule = mainModules.some(mod => filePath.endsWith(mod));

  // 2. NO está en subdirectorios internos
  const isInternalSubdir = filePath.includes('analyses/') ||
                           filePath.includes('utils/') ||
                           filePath.includes('helpers/');

  // 3. Nombres de funciones que indican API pública
  const publicAPIPatterns = [
    /^index/i,        // indexProject
    /^build/i,        // buildGraph
    /^parse/i,        // parseFile, parseFiles
    /^resolve/i,      // resolveImports
    /^scan/i,         // scanDirectory
    /^analyze/i,      // analyzeCode
    /^get/i,          // getImpactMap, getSystemMap
    /^generate/i      // generateReport
  ];

  const hasPublicName = publicAPIPatterns.some(pattern =>
    pattern.test(exportName)
  );

  // Es API pública si:
  // - Es un módulo principal Y tiene nombre público
  // - Y NO está en subdirectorio interno
  return isMainModule && hasPublicName && !isInternalSubdir;
}
