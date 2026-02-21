/**
 * Value generators by type
 * @module mcp/tools/generate-tests/input-generator/value-generators
 */

/**
 * Genera valor de muestra basado en tipo, nombre y contexto del átomo
 * @param {string} type - Parameter type
 * @param {string} name - Parameter name
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated value as string
 */
export function generateSampleValueForType(type, name = '', atom = {}) {
  const nameLower = name.toLowerCase();
  const archetype = atom.archetype?.type || '';
  const semanticDomain = atom.semanticDomain;
  
  // PRIORIDAD 1: Usar semanticDomain si está disponible
  if (semanticDomain?.primary && semanticDomain.inputPatterns) {
    const semanticValue = generateInputFromSemanticDomain(semanticDomain, name);
    if (semanticValue) return semanticValue;
  }
  
  // PRIORIDAD 2: Inferencia por nombre del parámetro
  if (nameLower.includes('options') || nameLower.includes('config') || nameLower.includes('opts')) {
    return generateOptionsInput(atom);
  }
  
  if (nameLower.includes('operation') || nameLower === 'op') {
    return generateOperationInput(atom);
  }
  
  if (archetype === 'orchestrator' && atom.callGraph?.callsList) {
    return generateOrchestratorInput(name, atom);
  }
  
  if (nameLower.includes('callback') || nameLower.includes('fn') || nameLower.includes('handler')) {
    return 'vi.fn()';
  }
  
  if (nameLower.includes('file') || nameLower.includes('path')) {
    return '"/test/file.js"';
  }
  
  if (nameLower.includes('text') || nameLower.includes('content') || nameLower.includes('string')) {
    return '"sample text"';
  }
  
  if (nameLower.includes('data') || nameLower.includes('obj')) {
    return '{ key: "value" }';
  }
  
  if (nameLower.includes('id')) {
    return '"test-id-123"';
  }
  
  // Por tipo
  switch (type) {
    case 'string': return '"sample-string"';
    case 'number': return '42';
    case 'boolean': return 'true';
    case 'array': return '[]';
    case 'Object': return '{}';
    case 'Promise': return 'Promise.resolve({})';
    case 'Function': return 'vi.fn()';
    default: return '{}';
  }
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
