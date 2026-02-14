/**
 * @fileoverview Import Parser - Parseo de imports
 * 
 * @module parsers/modules
 */

/**
 * Find all imports in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of import info
 */
export function findImports(code) {
  const imports = [];
  
  // ES6 imports: import { x } from 'module'
  const namedImportPattern = /import\s+\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = namedImportPattern.exec(code)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    imports.push({
      type: 'NamedImport',
      names,
      source: match[2],
      start: match.index
    });
  }
  
  // Default imports: import X from 'module'
  const defaultImportPattern = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = defaultImportPattern.exec(code)) !== null) {
    imports.push({
      type: 'DefaultImport',
      name: match[1],
      source: match[2],
      start: match.index
    });
  }
  
  // Namespace imports: import * as X from 'module'
  const namespacePattern = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = namespacePattern.exec(code)) !== null) {
    imports.push({
      type: 'NamespaceImport',
      name: match[1],
      source: match[2],
      start: match.index
    });
  }
  
  // Side-effect imports: import 'module'
  const sideEffectPattern = /import\s+['"]([^'"]+)['"];?/g;
  while ((match = sideEffectPattern.exec(code)) !== null) {
    imports.push({
      type: 'SideEffectImport',
      source: match[1],
      start: match.index
    });
  }
  
  // CommonJS requires
  const requirePattern = /(?:const|let|var)\s+(\{?[^=]+\}?)\s+=\s+require\(['"]([^'"]+)['"]\);?/g;
  while ((match = requirePattern.exec(code)) !== null) {
    imports.push({
      type: 'CommonJSRequire',
      names: match[1].includes('{') 
        ? match[1].replace(/[{\s}]/g, '').split(',')
        : [match[1].trim()],
      source: match[2],
      start: match.index
    });
  }
  
  return imports;
}

/**
 * Find dynamic imports
 * @param {string} code - Source code
 * @returns {Array} Dynamic imports
 */
export function findDynamicImports(code) {
  const imports = [];
  
  const dynamicPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = dynamicPattern.exec(code)) !== null) {
    imports.push({
      type: 'DynamicImport',
      source: match[1],
      start: match.index
    });
  }
  
  return imports;
}
