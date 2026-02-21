/**
 * @fileoverview Input Generator for Test Generation
 * 
 * Genera inputs de prueba basados en metadata de la función y el grafo.
 * Usa las dependencias reales del grafo en lugar de mocks genéricos.
 * 
 * @module mcp/tools/generate-tests/input-generator
 */

/**
 * Genera inputs tipados basados en el análisis completo del átomo
 */
export function generateTypedInputs(inputs, typeContracts, atom = {}) {
  if (!inputs || inputs.length === 0) return {};
  
  const result = {};
  const params = typeContracts?.params || [];
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const paramType = params[i]?.type || input.type;
    result[input.name] = generateSampleValueForType(paramType, input.name, atom);
  }
  return result;
}

/**
 * Genera valor de muestra basado en tipo, nombre y contexto del átomo
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
 */
function generateOperationInput(atom) {
  const callsList = atom.callGraph?.callsList || [];
  const callsValidate = callsList.some(c => c.name === 'validate' || c.name === 'validateEdit');
  
  if (callsValidate) {
    // Si valida, necesita estructura con método validate
    return '{ type: "edit", filePath: "/test/file.js", oldString: "old", newString: "new", validate: vi.fn().mockResolvedValue({ valid: true }) }';
  }
  
  return '{ type: "edit", filePath: "/test/file.js", oldString: "old", newString: "new" }';
}

/**
 * Genera input de opciones basado en las dependencias del átomo
 */
function generateOptionsInput(atom) {
  const callsList = atom.callGraph?.callsList || [];
  const dataFlowNodes = atom.dataFlow?.analysis?.inferredTypes?.nodes || [];
  
  // Detectar variables usadas desde dataFlow
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
  
  // Si hay validaciones, agregar flags
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

/**
 * Genera inputs para disparar una condición de throw específica
 */
export function generateInputsForThrowCondition(thrown, inputs, typeContracts, atom) {
  const condition = thrown.condition || '';
  const result = generateTypedInputs(inputs, typeContracts, atom);
  
  // Analizar la condición y generar inputs que la disparen
  const throwInput = analyzeThrowCondition(condition, thrown, atom);
  
  // Merge con los inputs base
  return { ...result, ...throwInput };
}

/**
 * Analiza una condición de throw y genera inputs para dispararla
 */
function analyzeThrowCondition(condition, thrown, atom) {
  const result = {};
  const condLower = condition.toLowerCase();
  const callsList = atom?.callGraph?.callsList || [];
  
  // !safety.safe -> mock del safety validator para que falle
  if (condLower.includes('safety')) {
    result.options = generateFailingSafetyOptions(atom);
  }
  
  // !result.success / !validation.valid -> operación inválida
  if (condLower.includes('result') || condLower.includes('success') || condLower.includes('valid')) {
    result.operation = '{ type: "edit", filePath: "/test/file.js", oldString: "old", newString: "new", validate: vi.fn().mockResolvedValue({ valid: false, error: "test error" }) }';
  }
  
  // !syntax.valid -> mock del syntax validator para que falle
  if (condLower.includes('syntax')) {
    result.options = generateFailingSyntaxOptions(atom);
  }
  
  // null/undefined checks
  if (condLower.includes('!') && (condLower.includes('null') || condLower.includes('undefined'))) {
    for (const input of atom?.dataFlow?.inputs || []) {
      result[input.name] = 'null';
    }
  }
  
  // empty string/array
  if (condLower.includes('empty')) {
    for (const input of atom?.dataFlow?.inputs || []) {
      if (input.name.toLowerCase().includes('string') || input.name.toLowerCase().includes('text')) {
        result[input.name] = '""';
      } else if (input.name.toLowerCase().includes('array') || input.name.toLowerCase().includes('list')) {
        result[input.name] = '[]';
      }
    }
  }
  
  return result;
}

/**
 * Genera options con safety validator que falla
 */
function generateFailingSafetyOptions(atom) {
  const callsList = atom?.callGraph?.callsList || [];
  const hasEmit = callsList.some(c => c.name === 'emit');
  
  let options = `validators: { safety: { validateEdit: vi.fn().mockResolvedValue({ safe: false, error: "Safety check failed" }) } }, enableSafetyChecks: true`;
  
  if (hasEmit) {
    options += `, emit: vi.fn()`;
  }
  
  return `{ ${options} }`;
}

/**
 * Genera options con syntax validator que falla
 */
function generateFailingSyntaxOptions(atom) {
  const callsList = atom?.callGraph?.callsList || [];
  const hasEmit = callsList.some(c => c.name === 'emit');
  
  let options = `validators: { syntax: { validate: vi.fn().mockResolvedValue({ valid: false, error: "Syntax error" }) } }, enableSyntaxValidation: true`;
  
  if (hasEmit) {
    options += `, emit: vi.fn()`;
  }
  
  return `{ ${options} }`;
}

/**
 * Genera inputs inválidos para edge cases
 */
export function generateInvalidInputs(inputs) {
  if (!inputs || inputs.length === 0) return {};
  
  const result = {};
  for (const input of inputs) {
    result[input.name] = generateInvalidValue(input.type, input.name);
  }
  return result;
}

/**
 * Genera un valor invalido basado en el tipo
 */
function generateInvalidValue(type, name) {
  const nameLower = name.toLowerCase();
  
  // Por nombre
  if (nameLower.includes('file') || nameLower.includes('path')) {
    return '"/nonexistent/path/to/file.js"';
  }
  if (nameLower.includes('callback') || nameLower.includes('fn')) {
    return 'null';
  }
  
  // Por tipo
  switch (type) {
    case 'string': return '123';
    case 'number': return '"not a number"';
    case 'boolean': return '"not a boolean"';
    case 'array': return '{}';
    case 'object':
    case 'Object': return '[]';
    default: return 'null';
  }
}

export default {
  generateTypedInputs,
  generateSampleValueForType,
  generateInputsForThrowCondition,
  generateInvalidInputs
};
