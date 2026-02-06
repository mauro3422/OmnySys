/**
 * @fileoverview imports.js
 * 
 * Extrae imports del AST (ESM, CommonJS, dynamic)
 * 
 * @module parser/extractors/imports
 */

/**
 * Extrae imports de ImportDeclaration (ESM)
 * @param {Object} nodePath - Path de Babel
 * @returns {Object|null} - Import extraído
 */
export function extractESMImport(nodePath) {
  const node = nodePath.node;
  const source = node.source.value;
  const specifiers = node.specifiers.map(spec => {
    if (spec.type === 'ImportDefaultSpecifier') {
      return { type: 'default', local: spec.local.name };
    } else if (spec.type === 'ImportNamespaceSpecifier') {
      return { type: 'namespace', local: spec.local.name };
    } else {
      return {
        type: 'named',
        imported: spec.imported.name,
        local: spec.local.name
      };
    }
  });

  return {
    source,
    specifiers,
    type: 'esm'
  };
}

/**
 * Extrae require() (CommonJS)
 * @param {Object} node - Nodo CallExpression
 * @returns {Object|null} - Import extraído
 */
export function extractCommonJSRequire(node) {
  if (node.callee.type === 'Identifier' &&
      node.callee.name === 'require' &&
      node.arguments.length > 0) {
    const arg = node.arguments[0];
    if (arg.type === 'StringLiteral' || arg.type === 'Literal') {
      return {
        source: arg.value,
        type: 'commonjs'
      };
    }
  }
  return null;
}

/**
 * Extrae import() dinámico
 * @param {Object} node - Nodo CallExpression
 * @returns {Object|null} - Import extraído
 */
export function extractDynamicImport(node) {
  if (node.callee?.type === 'Import' && node.arguments?.length > 0) {
    const arg = node.arguments[0];
    let source = '<dynamic>';
    if (arg.type === 'StringLiteral' || arg.type === 'Literal') {
      source = arg.value;
    }
    return {
      source,
      type: 'dynamic'
    };
  }
  return null;
}
