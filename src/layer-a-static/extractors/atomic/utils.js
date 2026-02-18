/**
 * @fileoverview utils.js
 * 
 * Utilidades compartidas para extractores atómicos
 * SSOT: Todas las funciones auxiliares en un solo lugar
 * 
 * @module extractors/atomic/utils
 */

/**
 * Crea la estructura base de un átomo
 * Siguiendo SSOT: Estructura única y consistente
 * @param {Object} data - Datos del átomo
 * @returns {Object} - Átomo completo
 */
export function createAtom(data) {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    file: data.file,
    line: data.line,
    column: data.column,
    className: data.className || null,
    signature: data.signature,
    dataFlow: data.dataFlow,
    calls: data.calls,
    calledBy: [], // Se llena en post-proceso
    archetype: null, // Se detecta en análisis posterior
    visibility: data.visibility,
    exported: data.exported,
    complexity: data.complexity,
    lines: data.dataFlow?.lines || 0,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Extrae la firma de una función
 * @param {Object} node - Nodo de función
 * @returns {Object} - Firma {params, returnType, async, generator}
 */
export function extractSignature(node) {
  return {
    params: (node.params || []).map((param, index) => ({
      name: param.name || `param${index}`,
      position: index,
      optional: param.optional || false,
      type: inferParamType(param)
    })),
    returnType: inferReturnType(node),
    async: node.async || false,
    generator: node.generator || false
  };
}

/**
 * Extrae el data flow (inputs, transforms, outputs) de un átomo
 * @param {Object} path - Path AST de Babel
 * @returns {Object} - Data flow completo
 */
export function extractDataFlow(path) {
  const inputs = [];
  const transformations = [];
  const outputs = [];
  const sideEffects = [];
  const lines = { start: 0, end: 0 };
  
  const node = path.node;
  lines.start = node.loc?.start?.line;
  lines.end = node.loc?.end?.line;
  
  path.traverse({
    Identifier(innerPath) {
      const paramNames = (path.node.params || []).map(p => p.name);
      if (paramNames.includes(innerPath.node.name)) {
        inputs.push({
          name: innerPath.node.name,
          line: innerPath.node.loc?.start?.line
        });
      }
    },
    
    ReturnStatement(innerPath) {
      outputs.push({
        type: 'return',
        line: innerPath.node.loc?.start?.line
      });
    },
    
    CallExpression(innerPath) {
      const callee = extractCallee(innerPath.node.callee);
      if (isSideEffect(innerPath, callee)) {
        sideEffects.push({
          callee,
          line: innerPath.node.loc?.start?.line
        });
      }
    }
  });
  
  // Dedupe inputs
  const uniqueInputs = [...new Map(inputs.map(i => [i.name, i])).values()];
  
  return {
    inputs: uniqueInputs,
    transformations,
    outputs,
    sideEffects,
    lines
  };
}

/**
 * Extrae las llamadas a otras funciones
 * @param {Object} path - Path AST de Babel
 * @returns {Array} - Lista de llamadas
 */
export function extractCalls(path) {
  const calls = [];
  
  path.traverse({
    CallExpression(innerPath) {
      const callee = extractCallee(innerPath.node.callee);
      if (callee) {
        calls.push({
          callee,
          line: innerPath.node.loc?.start?.line
        });
      }
    }
  });
  
  // Dedupe
  return [...new Map(calls.map(c => [c.callee, c])).values()];
}

/**
 * Calcula complejidad ciclomática
 * @param {Object} path - Path AST de Babel
 * @returns {number} - Complejidad
 */
export function calculateComplexity(path) {
  let complexity = 1;
  
  path.traverse({
    IfStatement() { complexity++; },
    ConditionalExpression() { complexity++; },
    SwitchCase() { complexity++; },
    CatchClause() { complexity++; },
    LogicalExpression(node) {
      if (node.operator === '&&' || node.operator === '||') {
        complexity++;
      }
    },
    ForStatement() { complexity++; },
    ForOfStatement() { complexity++; },
    WhileStatement() { complexity++; }
  });
  
  return complexity;
}

/**
 * Determina si una función está exportada
 * @param {Object} path - Path AST
 * @returns {boolean} - Es exportada
 */
export function isExported(path) {
  if (!path) return false;
  
  if (path.parent?.type === 'ExportNamedDeclaration' ||
      path.parent?.type === 'ExportDefaultDeclaration') {
    return true;
  }
  
  if (path.parent?.type === 'VariableDeclaration' &&
      path.parentPath?.parent?.type === 'ExportNamedDeclaration') {
    return true;
  }
  
  return false;
}

// Helper functions
function inferParamType(param) {
  if (param.typeAnnotation) return 'typed';
  if (param.type === 'ObjectPattern') return 'object-destructured';
  if (param.type === 'ArrayPattern') return 'array-destructured';
  return 'any';
}

function inferReturnType(node) {
  if (node.returnType) return 'typed';
  if (node.async) return 'Promise';
  return 'unknown';
}

function extractCallee(node) {
  if (!node) return null;
  
  if (node.type === 'Identifier') {
    return node.name;
  }
  
  if (node.type === 'MemberExpression') {
    const object = extractCallee(node.object);
    const property = node.property?.name || node.property?.value;
    return `${object}.${property}`;
  }
  
  return 'anonymous';
}

function isSideEffect(path, callee) {
  if (!callee) return false;
  if (path.parent?.type === 'AwaitExpression') return true;
  
  const sideEffects = [
    'console.log', 'console.error', 'fetch', 'axios',
    'localStorage', 'sessionStorage', 'document.querySelector'
  ];
  
  return sideEffects.some(fn => callee.includes(fn));
}
