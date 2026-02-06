/**
 * @fileoverview exports.js
 * 
 * Extrae exports del AST (named, default, re-exports)
 * 
 * @module parser/extractors/exports
 */

/**
 * Extrae exports nombrados
 * @param {Object} nodePath - Path de Babel
 * @returns {Array} - Array de exports
 */
export function extractNamedExports(nodePath) {
  const node = nodePath.node;
  const exports = [];

  if (node.specifiers && node.specifiers.length > 0) {
    // export { x, y } o export { x } from './file' (re-export)
    const isReexport = !!node.source;

    node.specifiers.forEach(spec => {
      exports.push({
        type: isReexport ? 'reexport' : 'named',
        name: spec.exported.name,
        local: spec.local ? spec.local.name : spec.exported.name,
        source: isReexport ? node.source.value : undefined
      });
    });
  } else if (node.declaration) {
    // export function/class/const/let/var
    const decl = node.declaration;
    if (decl.id) {
      exports.push({
        type: 'declaration',
        kind: decl.type,
        name: decl.id.name
      });
    } else if (decl.declarations) {
      // export const x = ..., y = ...
      decl.declarations.forEach(d => {
        if (d.id.type === 'Identifier') {
          exports.push({
            type: 'declaration',
            kind: decl.type,
            name: d.id.name
          });
        }
      });
    }
  }

  return exports;
}

/**
 * Extrae default export
 * @param {Object} nodePath - Path de Babel
 * @returns {Object} - Export default
 */
export function extractDefaultExport(nodePath) {
  const node = nodePath.node;
  return {
    type: 'default',
    kind: node.declaration.type
  };
}
