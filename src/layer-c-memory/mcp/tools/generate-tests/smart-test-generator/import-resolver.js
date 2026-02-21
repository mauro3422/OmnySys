/**
 * Import path resolver
 * @module mcp/tools/generate-tests/smart-test-generator/import-resolver
 */

import { resolveFactory } from '../factory-catalog.js';

/**
 * Determina el path de import correcto basado en el factory catalog
 * @param {string} filePath - Source file path
 * @param {string} className - Class name
 * @param {string} projectPath - Project root path
 * @returns {Object} - Import info
 */
export function determineImportPath(filePath, className, projectPath) {
  // Intentar resolver usando factory catalog
  const factoryEntry = resolveFactory(filePath);
  
  if (factoryEntry) {
    return {
      type: 'factory',
      path: factoryEntry.factoryPath,
      importPath: `#${factoryEntry.factoryPath.replace('.js', '').replace(/\//g, '/')}`,
      builderName: className
    };
  }
  
  // Para factories de test, usar alias #tests/
  if (filePath.includes('tests/factories/')) {
    const hasIndex = filePath.includes('/builders.js') || filePath.includes('/index.js');
    const basePath = filePath.replace('tests/', '#tests/').replace('.js', '');
    
    return {
      type: 'test-factory',
      path: filePath,
      importPath: hasIndex ? `${basePath}/index` : basePath,
      builderName: className
    };
  }
  
  // Para código fuente en src/, usar alias #
  if (filePath.startsWith('src/')) {
    return {
      type: 'source',
      path: filePath,
      importPath: `#${filePath.replace('src/', '').replace('.js', '')}`,
      builderName: className
    };
  }
  
  // Fallback
  return {
    type: 'suggested',
    path: filePath,
    importPath: `#${filePath.replace('.js', '')}`,
    builderName: className,
    suggestion: `Consider creating a factory in tests/factories/ for ${className}`
  };
}

/**
 * Sugiere ubicación para el archivo de test
 * @param {string} sourceFilePath - Source file path
 * @param {string} className - Class name
 * @param {string} projectPath - Project root path
 * @returns {Object} - Test location info
 */
export function suggestTestLocation(sourceFilePath, className, projectPath) {
  const isTestFactory = sourceFilePath.includes('tests/factories/');
  
  if (isTestFactory) {
    const basePath = sourceFilePath.replace('tests/factories/', '').replace('.js', '');
    return {
      primary: `tests/unit/factories/${basePath}.test.js`,
      alternative: `tests/factories/${basePath}.test.js`,
      reasoning: 'Factories should have unit tests in tests/unit/factories/'
    };
  }
  
  // Para código fuente, seguir estructura mirror
  const relativePath = sourceFilePath.replace(/^src\//, '');
  return {
    primary: `tests/unit/${relativePath.replace('.js', '.test.js')}`,
    alternative: `tests/integration/${relativePath.replace('.js', '.test.js')}`,
    reasoning: 'Follows project structure: tests/unit mirrors src/'
  };
}
