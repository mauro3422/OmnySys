/**
 * Value generators by type
 * @module mcp/tools/generate-tests/input-generator/value-generators
 */

/**
 * Genera valor basado en tipo inferido del dataFlow
 * @param {string} inferredType - Tipo inferido
 * @param {string} paramName - Nombre del parámetro
 * @returns {string|null} - Valor generado
 */
function generateFromInferredType(inferredType, paramName) {
  if (!inferredType || inferredType === 'unknown') return null;
  
  const t = inferredType.toLowerCase();
  const n = paramName.toLowerCase();
  
  // Tipos HTTP/Express directamente del inferrer
  if (t === 'httprequest') {
    return '{ body: {}, params: {}, query: {}, headers: {}, method: "GET", path: "/test" }';
  }
  if (t === 'httpresponse') {
    return 'vi.fn(() => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() }))';
  }
  
  // Tipos primitivos
  if (t === 'string') return '"sample-string"';
  if (t === 'number' || t === 'int' || t === 'float') return '42';
  if (t === 'boolean') return 'true';
  if (t === 'array') return '[]';
  if (t === 'object') return '{}';
  if (t === 'function') return 'vi.fn()';
  if (t === 'promise') return 'Promise.resolve({})';
  if (t === 'error') return 'new Error("test error")';
  
  // Arrays con tipos genéricos
  if (t.includes('array<') || t.includes('[]')) {
    const innerType = t.replace(/array<|>|[]/g, '').trim();
    if (innerType === 'string') return '["item1", "item2"]';
    if (innerType === 'number') return '[1, 2, 3]';
    if (innerType === 'object') return '[{}]';
    return '[]';
  }
  
  // Objetos conocidos por nombre de parámetro (fallback)
  if (n.includes('request') || n.includes('req')) {
    return '{ body: {}, params: {}, query: {} }';
  }
  if (n.includes('response') || n.includes('res')) {
    return 'vi.fn(() => ({ status: vi.fn(() => ({ json: vi.fn() })) }))';
  }
  if (n.includes('state') || n.includes('manager')) {
    return '{ paused: false, resume: vi.fn(), pause: vi.fn() }';
  }
  if (n.includes('config') || n.includes('options')) {
    return '{ enabled: true, timeout: 5000 }';
  }
  
  return null;
}

/**
 * Detecta el tipo de objeto basado en cómo se usa en el callGraph
 * @param {string} name - Nombre del parámetro
 * @param {Object} callGraph - Metadatos del callGraph
 * @returns {string|null} - Tipo detectado
 */
function detectObjectTypeFromCalls(name, callGraph) {
  if (!callGraph?.callsList) return null;
  
  const nameLower = name.toLowerCase();
  const calls = callGraph.callsList;
  
  // Detectar arrays por uso de métodos de array
  const arrayMethods = ['some', 'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'every', 'includes', 'push', 'pop', 'shift', 'unshift', 'sort', 'slice', 'splice', 'concat', 'join', 'flat', 'flatMap'];
  for (const call of calls) {
    if (arrayMethods.includes(call.name)) {
      return 'array';
    }
  }
  
  // Detectar response HTTP (Express-style)
  if (nameLower === 'res' || nameLower === 'response') {
    const hasStatus = calls.some(c => c.name === 'status');
    const hasJson = calls.some(c => c.name === 'json');
    if (hasStatus || hasJson) {
      return 'httpResponse';
    }
  }
  
  // Detectar request HTTP
  if (nameLower === 'req' || nameLower === 'request') {
    const hasBody = calls.some(c => c.name === 'body');
    const hasParams = calls.some(c => c.name === 'params');
    const hasQuery = calls.some(c => c.name === 'query');
    if (hasBody || hasParams || hasQuery) {
      return 'httpRequest';
    }
  }
  
  // Detectar state/manager
  if (nameLower === 'state' || nameLower === 'manager') {
    const hasPause = calls.some(c => c.name === 'pause' || c.name === 'resume');
    const hasStart = calls.some(c => c.name === 'start' || c.name === 'stop');
    if (hasPause || hasStart) {
      return 'stateManager';
    }
  }
  
  // Detectar callback/handler
  if (nameLower.includes('callback') || nameLower.includes('handler') || nameLower.includes('next')) {
    return 'callback';
  }
  
  return null;
}

/**
 * Genera mock basado en el tipo detectado
 * @param {string} type - Tipo de objeto
 * @param {string} name - Nombre del parámetro
 * @returns {string} - Mock generado
 */
function generateMockByType(type, name) {
  switch (type) {
    case 'httpResponse':
      return 'vi.fn(() => ({ status: vi.fn(() => ({ json: vi.fn() })) }))';
    case 'httpRequest':
      return '{ body: {}, params: {}, query: {} }';
    case 'stateManager':
      return '{ paused: false, resume: vi.fn(), pause: vi.fn() }';
    case 'callback':
      return 'vi.fn()';
    default:
      return null;
  }
}

/**
 * Estrategias de generación priorizadas
 */
const GENERATION_STRATEGIES = [
  // Prioridad -1: Inferred types del dataFlow
  {
    name: 'inferredType',
    check: (nameLower, atom) => atom.dataFlow?.analysis?.inferredTypes?.variables?.[nameLower],
    generate: (nameLower, atom) => {
      const inferredType = atom.dataFlow.analysis.inferredTypes.variables[nameLower];
      if (inferredType && inferredType !== 'unknown') {
        return generateFromInferredType(inferredType, nameLower);
      }
      return null;
    }
  },
  // Prioridad 0: Detectar tipo desde callGraph
  {
    name: 'callGraph',
    check: (nameLower, atom) => atom.callGraph?.callsList,
    generate: (nameLower, atom) => {
      const detectedType = detectObjectTypeFromCalls(nameLower, atom.callGraph);
      if (detectedType) {
        return generateMockByType(detectedType, nameLower);
      }
      return null;
    }
  },
  // Prioridad 1: Semantic domain
  {
    name: 'semanticDomain',
    check: (nameLower, atom) => atom.semanticDomain?.primary && atom.semanticDomain.inputPatterns,
    generate: (nameLower, atom) => generateInputFromSemanticDomain(atom.semanticDomain, nameLower)
  },
  // Prioridad 2: Patterns por nombre
  {
    name: 'optionsPattern',
    check: (nameLower) => nameLower.includes('options') || nameLower.includes('config') || nameLower.includes('opts'),
    generate: (nameLower, atom) => generateOptionsInput(atom)
  },
  {
    name: 'operationPattern',
    check: (nameLower) => nameLower.includes('operation') || nameLower === 'op',
    generate: (nameLower, atom) => generateOperationInput(atom)
  },
  {
    name: 'orchestratorPattern',
    check: (nameLower, atom) => atom.archetype?.type === 'orchestrator' && atom.callGraph?.callsList,
    generate: (nameLower, atom) => generateOrchestratorInput(nameLower, atom)
  },
  // Prioridad 3: Tipos simples por nombre
  {
    name: 'callback',
    check: (nameLower) => nameLower.includes('callback') || nameLower.includes('fn') || nameLower.includes('handler'),
    generate: () => 'vi.fn()'
  },
  {
    name: 'file',
    check: (nameLower) => nameLower.includes('file') || nameLower.includes('path'),
    generate: () => '"/test/file.js"'
  },
  {
    name: 'text',
    check: (nameLower) => nameLower.includes('text') || nameLower.includes('content') || nameLower.includes('string'),
    generate: () => '"sample text"'
  },
  {
    name: 'data',
    check: (nameLower) => nameLower.includes('data') || nameLower.includes('obj'),
    generate: () => '{ key: "value" }'
  },
  {
    name: 'id',
    check: (nameLower) => nameLower.includes('id'),
    generate: () => '"test-id-123"'
  }
];

/**
 * Tipos primitivos por defecto
 */
const PRIMITIVE_TYPES = {
  string: '"sample-string"',
  number: '42',
  boolean: 'true',
  array: '[]',
  Object: '{}',
  Promise: 'Promise.resolve({})',
  Function: 'vi.fn()'
};

/**
 * Genera valor de muestra basado en tipo, nombre y contexto del átomo
 * @param {string} type - Parameter type
 * @param {string} name - Parameter name
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated value as string
 */
export function generateSampleValueForType(type, name = '', atom = {}) {
  const nameLower = name.toLowerCase();

  // Ejecutar estrategias en orden de prioridad
  for (const strategy of GENERATION_STRATEGIES) {
    if (strategy.check(nameLower, atom)) {
      const value = strategy.generate(nameLower, atom);
      if (value) return value;
    }
  }

  // Fallback a tipos primitivos
  return PRIMITIVE_TYPES[type] || '{}';
}

/**
 * Genera inputs basados en semanticDomain
 * @param {Object} semanticDomain - Semantic domain metadata
 * @param {string} paramName - Parameter name
 * @returns {string|null} - Generated value or null
 */
function generateInputFromSemanticDomain(semanticDomain, paramName) {
  const domain = semanticDomain.primary;
  const inputPatterns = semanticDomain.inputPatterns || [];
  const nameLower = paramName.toLowerCase();
  
  // JSON domain
  if (domain === 'json') {
    if (inputPatterns.includes('json-string') || inputPatterns.includes('text-with-json')) {
      return '\'{"name": "test", "value": 123}\'';
    }
    if (inputPatterns.includes('json-array')) {
      return '\'[1, 2, 3]\'';
    }
    return '\'{"key": "value"}\'';
  }
  
  // HTTP/API domain
  if (domain === 'http') {
    if (inputPatterns.includes('url-string') || inputPatterns.includes('api-endpoint')) {
      return '"https://api.example.com/endpoint"';
    }
    if (inputPatterns.includes('request-options')) {
      return '{ method: "GET", headers: {} }';
    }
  }
  
  // Filesystem domain
  if (domain === 'filesystem') {
    if (inputPatterns.includes('file-path')) {
      return '"/test/sample.txt"';
    }
    if (inputPatterns.includes('file-content')) {
      return '"sample file content"';
    }
    if (inputPatterns.includes('file-options')) {
      return '{ encoding: "utf-8" }';
    }
  }
  
  // Parsing domain
  if (domain === 'parsing') {
    if (nameLower.includes('text') || nameLower.includes('string')) {
      return '"input text to parse"';
    }
    return '"raw input data"';
  }
  
  // Validation domain
  if (domain === 'validation') {
    if (inputPatterns.includes('any-value')) {
      return '"test value"';
    }
    if (inputPatterns.includes('object-to-validate')) {
      return '{ field: "value" }';
    }
  }
  
  // LLM domain
  if (domain === 'llm') {
    if (inputPatterns.includes('prompt-string')) {
      return '"Write a function that..."';
    }
    if (inputPatterns.includes('message-array')) {
      return '[{ role: "user", content: "Hello" }]';
    }
    if (inputPatterns.includes('conversation-object')) {
      return '{ messages: [], model: "gpt-4" }';
    }
  }
  
  // String domain
  if (domain === 'string') {
    return '"sample text input"';
  }
  
  // Transformation domain
  if (domain === 'transformation') {
    return '{ input: "data" }';
  }
  
  return null;
}

/**
 * Genera input de operación basado en el contexto del átomo
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated operation input
 */
function generateOperationInput(atom) {
  const callsList = atom.callGraph?.callsList || [];
  const callsValidate = callsList.some(c => c.name === 'validate' || c.name === 'validateEdit');
  
  if (callsValidate) {
    return '{ type: "edit", filePath: "/test/file.js", oldString: "old", newString: "new", validate: vi.fn().mockResolvedValue({ valid: true }) }';
  }
  
  return '{ type: "edit", filePath: "/test/file.js", oldString: "old", newString: "new" }';
}

/**
 * Genera input de opciones basado en las dependencias del átomo
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated options input
 */
function generateOptionsInput(atom) {
  const callsList = atom.callGraph?.callsList || [];
  const dataFlowNodes = atom.dataFlow?.analysis?.inferredTypes?.nodes || [];
  
  const usedVariables = dataFlowNodes
    .filter(n => n.operation === 'property_access')
    .map(n => n.variable);
  
  const hasSafety = usedVariables.includes('enableSafetyChecks') || 
                    callsList.some(c => c.name === 'validateEdit');
  const hasSyntax = usedVariables.includes('enableSyntaxValidation') ||
                    callsList.some(c => c.name === 'validate');
  const hasEmit = usedVariables.includes('emit') || 
                  callsList.some(c => c.name === 'emit');
  const hasUndo = usedVariables.includes('enableUndo') || 
                  callsList.some(c => c.name === 'prepareUndo');
  const hasValidators = usedVariables.includes('validators');
  const hasGetModifiedContent = usedVariables.includes('getModifiedContent');
  
  const validators = [];
  
  if (hasSafety || hasValidators) {
    validators.push(`safety: { validateEdit: vi.fn().mockResolvedValue({ safe: true }) }`);
  }
  
  if (hasSyntax || hasValidators) {
    validators.push(`syntax: { validate: vi.fn().mockResolvedValue({ valid: true }) }`);
  }
  
  const options = [];
  
  if (validators.length > 0) {
    options.push(`validators: { ${validators.join(', ')} }`);
  }
  
  if (hasEmit) {
    options.push(`emit: vi.fn()`);
  }
  
  if (hasGetModifiedContent) {
    options.push(`getModifiedContent: vi.fn().mockResolvedValue("test content")`);
  }
  
  if (hasUndo) {
    options.push(`enableUndo: true`);
  }
  
  if (hasSafety) {
    options.push(`enableSafetyChecks: true`);
  }
  
  if (hasSyntax) {
    options.push(`enableSyntaxValidation: true`);
  }
  
  if (options.length === 0) {
    return '{}';
  }
  
  return `{ ${options.join(', ')} }`;
}

/**
 * Genera input para orchestrators basado en sus dependencias
 * @param {string} name - Parameter name
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated orchestrator input
 */
function generateOrchestratorInput(name, atom) {
  const callsList = atom.callGraph?.callsList || [];
  
  if (name.toLowerCase().includes('operation')) {
    return generateOperationInput(atom);
  }
  
  if (name.toLowerCase().includes('options')) {
    return generateOptionsInput(atom);
  }
  
  return '{}';
}
