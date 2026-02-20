/**
 * @fileoverview variable-extractor.js
 * 
 * Extrae variables y constantes exportadas como atoms
 * 
 * Tipos detectados:
 * - export const X = ...
 * - export let Y = ...
 * - export const X = { ... } (objetos de configuración)
 * - export const X = [...] (arrays)
 * - export const X = "string" (primitivos)
 * 
 * @module extractors/atomic/variable-extractor
 */

/**
 * Detecta el tipo de valor de una variable
 * @param {Object} initNode - Nodo de inicialización
 * @returns {string} - Tipo inferido
 */
function inferValueType(initNode) {
  if (!initNode) return 'unknown';
  
  switch (initNode.type) {
    case 'ObjectExpression':
      return 'object';
    case 'ArrayExpression':
      return 'array';
    case 'StringLiteral':
    case 'TemplateLiteral':
      return 'string';
    case 'NumericLiteral':
      return 'number';
    case 'BooleanLiteral':
      return 'boolean';
    case 'NullLiteral':
      return 'null';
    case 'NewExpression':
      return initNode.callee?.name || 'instance';
    case 'CallExpression':
      return 'call-result';
    case 'MemberExpression':
      return 'member';
    case 'Identifier':
      return 'reference';
    default:
      return 'expression';
  }
}

/**
 * Extrae propiedades de un objeto para metadata
 * @param {Object} objectNode - Nodo ObjectExpression
 * @returns {Array<string>} - Lista de nombres de propiedades
 */
function extractObjectProperties(objectNode) {
  if (!objectNode || objectNode.type !== 'ObjectExpression') return [];
  
  return objectNode.properties
    .filter(prop => prop.type === 'ObjectProperty' && prop.key)
    .map(prop => prop.key.name || prop.key.value)
    .filter(Boolean);
}

/**
 * Extrae una variable/constante como atom
 * @param {Object} path - Babel path del VariableDeclarator
 * @param {string} filePath - Ruta del archivo
 * @param {boolean} isExported - Si está exportado
 * @param {string} kind - 'const', 'let', 'var'
 * @returns {Object} - Atom de variable
 */
export function extractVariable(path, filePath, isExported = false, kind = 'const') {
  const node = path.node;
  const id = node.id;
  const init = node.init;
  
  if (!id || id.type !== 'Identifier') {
    return null;
  }
  
  const name = id.name;
  const valueType = inferValueType(init);
  const valueProperties = valueType === 'object' ? extractObjectProperties(init) : [];
  
  // Determinar línea
  const line = node.loc?.start?.line || 0;
  const endLine = node.loc?.end?.line || line;
  
  // Determinar si es "interesante" para el sistema
  // Objetos de configuración, arrays grandes, constantes importantes
  const isSignificant = 
    valueType === 'object' ||
    valueType === 'array' ||
    (valueType === 'reference' && init?.name);
  
  return {
    id: `${filePath}::${name}`,
    name,
    type: 'variable',
    filePath,
    line,
    endLine,
    linesOfCode: endLine - line + 1,
    
    // Variable-specific
    kind, // const, let, var
    valueType,
    valueProperties,
    isSignificant,
    
    // Export status
    isExported,
    
    // Metadata estándar
    complexity: 1, // Variables tienen complejidad mínima
    hasSideEffects: false,
    hasNetworkCalls: false,
    hasDomManipulation: false,
    hasStorageAccess: false,
    hasLogging: false,
    networkEndpoints: [],
    
    // Calls - las variables pueden tener referencias
    calls: [],
    internalCalls: [],
    externalCalls: [],
    externalCallCount: 0,
    
    // Para compatibilidad con otros extractors
    className: null,
    functionType: 'variable',
    isAsync: false,
    hasErrorHandling: false,
    hasNestedLoops: false,
    hasBlockingOps: false,
    
    // Temporal
    hasLifecycleHooks: false,
    lifecycleHooks: [],
    hasCleanupPatterns: false,
    temporal: {
      patterns: {
        timers: [],
        asyncPatterns: null,
        events: [],
        lifecycleHooks: [],
        executionOrder: {
          mustRunBefore: [],
          mustRunAfter: [],
          canRunInParallel: []
        }
      },
      executionOrder: null
    },
    
    // TypeContracts
    typeContracts: {
      params: [],
      returns: null,
      throws: [],
      generics: [],
      signature: `${kind} ${name}: ${valueType}`,
      confidence: 0.8
    },
    
    // Error flow
    errorFlow: {
      throws: [],
      catches: [],
      tryBlocks: [],
      unhandledCalls: [],
      propagation: 'none'
    },
    
    // Performance
    performance: {
      complexity: {
        cyclomatic: 1,
        cognitive: 0,
        bigO: 'O(1)'
      },
      expensiveOps: {
        nestedLoops: 0,
        recursion: false,
        blockingOps: [],
        heavyCalls: []
      },
      resources: {
        network: false,
        disk: false,
        memory: 'low',
        dom: false
      },
      estimates: {
        executionTime: 'instant',
        blocking: false,
        async: false,
        expensiveWithCache: false
      },
      impactScore: 0
    },
    
    // Data flow básico
    dataFlow: {
      graph: { nodes: [], edges: [], meta: { totalNodes: 0, totalEdges: 0 } },
      inputs: [],
      transformations: [],
      outputs: [{
        type: 'variable',
        name,
        valueType,
        line
      }],
      analysis: { invariants: [], inferredTypes: {} },
      _meta: { extractedAt: new Date().toISOString(), version: '1.0.0' }
    },
    hasDataFlow: true,
    dataFlowAnalysis: { invariants: [], inferredTypes: {} },
    
    // DNA placeholder
    dna: {
      structuralHash: `var-${name}-${line}`,
      patternHash: valueType,
      flowType: 'data',
      operationSequence: ['declare'],
      complexityScore: 1,
      inputCount: 0,
      outputCount: 1,
      transformationCount: 0,
      semanticFingerprint: 'variable',
      extractedAt: new Date().toISOString(),
      version: '1.0',
      id: `var-${name}`
    },
    
    lineage: null,
    extractedAt: new Date().toISOString(),
    
    _meta: {
      dataFlowVersion: '1.0.0-fractal',
      extractionTime: new Date().toISOString(),
      confidence: 0.7
    },
    
    // Archetype
    archetype: {
      type: valueType === 'object' ? 'config' : 'constant',
      severity: 1,
      confidence: 1
    },
    
    // calledBy se poblará en cross-file linkage
    calledBy: []
  };
}

/**
 * Extrae solo constantes exportadas
 * @param {string} code - Código fuente
 * @param {string} filePath - Ruta del archivo
 * @returns {Array} - Lista de atoms de variables
 */
export function extractExportedVariables(code, filePath) {
  const atoms = [];
  
  // Pattern para: export const X = ... o export let Y = ...
  const exportVarPattern = /export\s+(const|let|var)\s+(\w+)\s*=/g;
  let match;
  
  while ((match = exportVarPattern.exec(code)) !== null) {
    const kind = match[1];
    const name = match[2];
    const line = code.substring(0, match.index).split('\n').length;
    
    atoms.push({
      id: `${filePath}::${name}`,
      name,
      type: 'variable',
      filePath,
      line,
      kind,
      isExported: true,
      isSignificant: true
    });
  }
  
  return atoms;
}

export default extractVariable;