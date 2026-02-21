/**
 * Test file header generator
 * @module mcp/tools/generate-tests/smart-test-generator/header-generator
 */

/**
 * Genera header del archivo de test
 * @param {Object} importInfo - Import info
 * @param {string} className - Class name
 * @returns {string} - Generated header code
 */
export function generateTestFileHeader(importInfo, className) {
  let code = `/**
 * @fileoverview ${className} Tests
 * 
 * Tests auto-generated for ${className}
 * Pattern: ${importInfo.type === 'factory' ? 'Builder' : 'Standard'}
 * 
 * @module ${importInfo.path.replace('.js', '').replace(/\//g, '/')}
 */

import { describe, it, expect } from 'vitest';
`;
  
  code += `import { ${className} } from '${importInfo.importPath}';
`;
  
  code += `
`;
  
  return code;
}

/**
 * Genera bloque describe
 * @param {string} name - Block name
 * @param {Function} contentFn - Content generator function
 * @returns {string} - Generated describe block
 */
export function generateDescribeBlock(name, contentFn) {
  return `describe('${name}', () => {
${contentFn()}
});
`;
}
