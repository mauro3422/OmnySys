/**
 * @fileoverview Basic Metadata - Extracción de metadatos básicos de archivos
 * 
 * @module comprehensive-extractor/metadata
 */

/**
 * Extract basic file metadata
 * 
 * @param {string} filePath - Path to the file
 * @param {string} code - Source code
 * @returns {Object} - Basic metadata
 */
export function extractBasicMetadata(filePath, code) {
  return {
    filePath,
    size: code.length,
    lineCount: code.split('\n').length,
    hasImports: /import\s+|require\s*\(/.test(code),
    hasExports: /export\s+|module\.exports/.test(code),
    isTestFile: /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(filePath),
    isConfigFile: /(config|\.config)\.(js|ts|json)$/.test(filePath),
    isTypeScript: /\.(ts|tsx)$/.test(filePath),
    isJSX: /\.(jsx|tsx)$/.test(filePath)
  };
}

/**
 * Detect file type category
 * @param {string} filePath - Path to the file
 * @returns {string} File category
 */
export function detectFileCategory(filePath) {
  if (/\.(test|spec)\./.test(filePath)) return 'test';
  if (/(config|\.config)\./.test(filePath)) return 'config';
  if (/\.(ts|tsx)$/.test(filePath)) return 'typescript';
  if (/\.(jsx|tsx)$/.test(filePath)) return 'jsx';
  if (/\.js$/.test(filePath)) return 'javascript';
  return 'unknown';
}

/**
 * Calculate file complexity indicators
 * @param {string} code - Source code
 * @returns {Object} Complexity indicators
 */
export function calculateFileIndicators(code) {
  const lines = code.split('\n');
  
  return {
    totalLines: lines.length,
    codeLines: lines.filter(l => l.trim() && !l.trim().startsWith('//')).length,
    commentLines: lines.filter(l => l.trim().startsWith('//') || l.includes('/*')).length,
    blankLines: lines.filter(l => !l.trim()).length,
    maxLineLength: Math.max(...lines.map(l => l.length), 0),
    hasTrailingWhitespace: lines.some(l => l !== l.trimEnd())
  };
}
