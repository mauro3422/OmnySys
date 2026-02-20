/**
 * @fileoverview unused.js
 * Valida imports que no se utilizan en el código
 */

/**
 * Verifica si un nombre importado se usa en el código
 * @param {string} name - Nombre del import
 * @param {Array} fileAtoms - Átomos del archivo
 * @param {Array} exports - Exports del archivo
 * @param {string} content - Contenido del archivo
 * @returns {boolean} true si se usa
 */
function isImportUsed(name, fileAtoms, exports, content) {
  // Check if used in file atoms (calls, data flow, arguments)
  const isUsedInAtoms = fileAtoms.some(atom => {
    // Check calls
    if (atom.calls?.some(c => c.name === name || c.callee === name)) return true;
    // Check data flow
    if (atom.dataFlow?.transformations?.some(t => 
      t.from?.includes(name) || t.to === name
    )) return true;
    // Check if passed to other functions
    if (atom.calls?.some(c => c.arguments?.some(arg => arg === name))) return true;
    return false;
  });
  
  // Check if it's re-exported directly
  const isReExported = exports.some(e => e.name === name);
  
  // Check if used in export values (e.g., export const toolHandlers = { search_files })
  const isUsedInExports = exports.some(e => {
    const exportValue = JSON.stringify(e);
    return exportValue.includes(name);
  });
  
  // Check if used in source code text (object literals, shorthand, spread)
  const isUsedInSourceCode = content && (
    // Shorthand property: { get_impact_map }
    new RegExp(`{[^}]*\\b${name}\\b[^}]*}`).test(content) ||
    // Spread operator: ...PAGINATION_SCHEMA
    content.includes(`...${name}`) ||
    // Object property: { name: get_impact_map }
    new RegExp(`:\\s*${name}\\b`).test(content) ||
    // Array literal: [get_impact_map]
    new RegExp(`\\[.*\\b${name}\\b.*\\]`).test(content)
  );
  
  return isUsedInAtoms || isReExported || isUsedInExports || isUsedInSourceCode;
}

/**
 * Encuentra imports que no se utilizan
 * @param {Array} imports - Lista de imports
 * @param {Array} fileAtoms - Átomos del archivo
 * @param {Array} exports - Exports del archivo
 * @param {string} content - Contenido del archivo
 * @returns {Array} Imports no utilizados
 */
export function findUnusedImports(imports, fileAtoms, exports, content) {
  const unused = [];
  
  for (const imp of imports) {
    const source = imp.source || imp.module;
    if (!source) continue;
    
    // Skip node_modules
    if (!source.startsWith('.') && !source.startsWith('#')) {
      continue;
    }
    
    const importedNames = imp.specifiers?.map(s => s.local) || [];
    
    for (const name of importedNames) {
      if (name === '*') continue; // Skip namespace imports
      
      if (!isImportUsed(name, fileAtoms, exports, content)) {
        unused.push({
          import: name,
          source: source,
          line: imp.line,
          reason: 'Imported but never used'
        });
      }
    }
  }
  
  return unused;
}
