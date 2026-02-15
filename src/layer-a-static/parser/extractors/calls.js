/**
 * @fileoverview calls.js
 * 
 * Extrae llamadas a funciones y referencias a identificadores
 * 
 * @module parser/extractors/calls
 */

/**
 * Extrae llamadas de un CallExpression
 * @param {Object} node - Nodo CallExpression
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractCallExpression(node, fileInfo) {
  if (!node?.callee) return fileInfo;
  if (node.callee.type === 'Identifier') {
    fileInfo.calls.push({
      name: node.callee.name,
      type: 'function'
    });
  } else if (node.callee.type === 'MemberExpression') {
    // tier1.findHotspots() → capturar como "tier1" y "tier1.findHotspots"
    // Also handle deep chains: a.b.c.d() → capture 'a' as namespace_access
    
    // Find the root identifier in the member chain
    let rootObject = node.callee.object;
    while (rootObject.type === 'MemberExpression' && rootObject.object) {
      rootObject = rootObject.object;
    }
    
    if (rootObject.type === 'Identifier') {
      const objectName = rootObject.name;
      const propertyName = node.callee.property?.name || node.callee.property?.value;

      // Capturar el namespace (tier1)
      fileInfo.calls.push({
        name: objectName,
        type: 'namespace_access'
      });

      // Capturar el acceso completo (tier1.findHotspots)
      if (propertyName) {
        fileInfo.calls.push({
          name: `${objectName}.${propertyName}`,
          type: 'member_call'
        });
      }
    }
  }

  return fileInfo;
}

/**
 * Extrae referencias a identificadores
 * @param {Object} nodePath - Path de Babel
 * @param {Object} fileInfo - Info del archivo acumulada
 * @returns {Object} - Info actualizada
 */
export function extractIdentifierRef(nodePath, fileInfo) {
  if (!nodePath) return fileInfo;
  
  const node = nodePath.node;
  const parent = nodePath.parent;
  
  if (!node || !parent) return fileInfo;

  // Ignorar declaraciones y definiciones
  if (
    parent.type === 'FunctionDeclaration' ||
    (parent.type === 'VariableDeclarator' && parent.id === node) ||
    parent.type === 'ImportSpecifier' ||
    parent.type === 'ImportDefaultSpecifier' ||
    parent.type === 'ImportNamespaceSpecifier' ||
    parent.type === 'ClassDeclaration' ||
    (parent.type === 'Property' && parent.key === node && !parent.computed) ||
    (parent.type === 'MemberExpression' && parent.property === node && !parent.computed)
  ) {
    return fileInfo;
  }

  // Capturar solo referencias válidas (usadas en expresiones)
  if (nodePath.isReferencedIdentifier()) {
    const name = node.name;
    // Evitar duplicados y nombres comunes de JS
    if (
      name !== 'undefined' &&
      name !== 'null' &&
      name !== 'console' &&
      !fileInfo.identifierRefs.includes(name)
    ) {
      fileInfo.identifierRefs.push(name);
    }
  }

  return fileInfo;
}
