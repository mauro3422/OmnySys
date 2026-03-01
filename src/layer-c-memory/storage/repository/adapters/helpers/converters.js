/**
 * @fileoverview converters.js
 * 
 * Funciones de conversión entre objetos Atom y filas de SQLite.
 * 
 * @module storage/repository/adapters/helpers/converters
 */

/**
 * Convierte un atomo de la estructura JSON a formato SQLite
 * (aplanando campos complejos en columnas)
 * 
 * TODOS los valores deben ser: number, string, bigint, buffer, o null
 * NO puede haber: undefined, NaN, Infinity, objects, arrays, functions
 */
export function atomToRow(atom) {
  const now = new Date().toISOString();

  // Calcular lines_of_code de forma segura
  const lineStart = safeNumber(atom.line || atom.lineStart, 1);
  const lineEnd = safeNumber(atom.endLine || atom.lineEnd || atom.line, lineStart);
  const linesOfCode = safeNumber(
    atom.linesOfCode || (lineEnd - lineStart + 1),
    1
  );

  return {
    // Identidad - strings obligatorios
    id: safeString(atom.id, 'unknown::unknown'),
    name: safeString(atom.name, 'unknown'),
    atom_type: safeString(atom.type || atom.atomType, 'function'),
    file_path: safeString(atom.file || atom.filePath, 'unknown'),

    // Vectores estructurales - integers
    line_start: lineStart,
    line_end: lineEnd,
    lines_of_code: linesOfCode,
    complexity: safeNumber(atom.complexity, 1),
    parameter_count: safeNumber(atom.signature?.params?.length, 0),

    // Flags - integers (0/1)
    is_exported: safeBoolInt(atom.exported || atom.isExported),
    is_async: safeBoolInt(atom.isAsync || atom.async),
    is_test_callback: safeBoolInt(atom.isTestCallback),
    test_callback_type: safeString(atom.testCallbackType),
    has_error_handling: safeBoolInt(atom.hasErrorHandling),
    has_network_calls: safeBoolInt(atom.hasNetworkCalls),

    // Clasificacion - purpose puede ser string o objeto { type, reason, confidence }
    archetype_type: safeString(atom.archetype?.type || atom.archetype),
    archetype_severity: safeNumber(atom.archetype?.severity),
    archetype_confidence: safeNumber(atom.archetype?.confidence),
    purpose_type: safePurpose(atom.purpose),
    purpose_confidence: safeNumber(atom.purposeConfidence || atom.purpose?.confidence),
    is_dead_code: safeBoolInt(atom.isDeadCode || atom.purpose?.isDeadCode),

    // Vectores matematicos - REAL numbers
    importance_score: safeNumber(atom.importanceScore || atom.derived?.fragilityScore, 0),
    coupling_score: safeNumber(atom.couplingScore || atom.derived?.couplingScore, 0),
    cohesion_score: safeNumber(atom.cohesionScore, 0),
    stability_score: safeNumber(atom.stabilityScore, 1),
    propagation_score: safeNumber(atom.propagationScore || atom.derived?.changeRisk, 0),
    fragility_score: safeNumber(atom.derived?.fragilityScore, 0),
    testability_score: safeNumber(atom.derived?.testabilityScore, 0),

    // Contadores - integers
    callers_count: safeNumber(atom.calledBy?.length, 0),
    callees_count: safeNumber(atom.calls?.length, 0),
    dependency_depth: safeNumber(atom.dependencyDepth, 0),
    external_call_count: safeNumber(atom.externalCallCount, 0),

    // Temporales
    extracted_at: safeString(atom.extractedAt || atom.analyzedAt, now),
    updated_at: safeString(atom.updatedAt, now),
    change_frequency: safeNumber(atom.changeFrequency, 0),
    age_days: safeNumber(atom.ageDays, 0),
    generation: safeNumber(atom.generation, 1),

    // JSON fields - siempre strings
    signature_json: safeJson(atom.signature),
    data_flow_json: safeJson(atom.dataFlow),
    calls_json: safeJson(atom.calls),
    temporal_json: safeJson(atom.temporal),
    error_flow_json: safeJson(atom.errorFlow),
    performance_json: safeJson(atom.performance),
    dna_json: safeJson(atom.dna),
    derived_json: safeJson({
      ...(atom.derived || {}),
      semantic: atom.semantic || {}
    }),
    _meta_json: safeJson(atom._meta || atom.meta),

    // Tree-sitter metadata (v0.9.62)
    shared_state_json: safeJson(atom.sharedStateAccess || []),
    event_emitters_json: safeJson(atom.eventEmitters || []),
    event_listeners_json: safeJson(atom.eventListeners || []),
    scope_type: safeString(atom.scopeType),

    // Relations and type
    called_by_json: safeJson(atom.calledBy || []),
    function_type: safeString(atom.functionType || atom.type || 'declaration')
  };
}

/**
 * Convierte una fila de SQLite a estructura de atomo
 */
export function rowToAtom(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.atom_type,
    filePath: row.file_path,

    line: row.line_start,
    lineStart: row.line_start,
    endLine: row.line_end,
    lineEnd: row.line_end,
    linesOfCode: row.lines_of_code,
    complexity: row.complexity,
    parameterCount: row.parameter_count,

    isExported: Boolean(row.is_exported),
    isAsync: Boolean(row.is_async),
    isTestCallback: Boolean(row.is_test_callback),
    testCallbackType: row.test_callback_type,
    hasErrorHandling: Boolean(row.has_error_handling),
    hasNetworkCalls: Boolean(row.has_network_calls),

    archetype: row.archetype_type ? {
      type: row.archetype_type,
      severity: row.archetype_severity,
      confidence: row.archetype_confidence
    } : null,
    purpose: row.purpose_type,
    purposeConfidence: row.purpose_confidence,
    isDeadCode: Boolean(row.is_dead_code),

    // Vectores matematicos
    importanceScore: row.importance_score,
    couplingScore: row.coupling_score,
    cohesionScore: row.cohesion_score,
    stabilityScore: row.stability_score,
    propagationScore: row.propagation_score,
    fragilityScore: row.fragility_score,
    testabilityScore: row.testability_score,

    // Contadores
    calls: safeParseJson(row.calls_json, []) || [],
    calledBy: safeParseJson(row.called_by_json, []) || [],
    dependencyDepth: row.dependency_depth,
    externalCallCount: row.external_call_count,

    // Legacy compatibility - función declarada vs arrow vs método
    functionType: row.function_type || 'declaration',

    // JSON parseados
    signature: safeParseJson(row.signature_json),
    dataFlow: safeParseJson(row.data_flow_json),
    temporal: safeParseJson(row.temporal_json),
    errorFlow: safeParseJson(row.error_flow_json),
    performance: safeParseJson(row.performance_json),
    dna: safeParseJson(row.dna_json),
    derived: safeParseJson(row.derived_json),
    semantic: safeParseJson(row.derived_json)?.semantic || {},

    // Tree-sitter metadata (v0.9.62)
    sharedStateAccess: safeParseJson(row.shared_state_json, []),
    eventEmitters: safeParseJson(row.event_emitters_json, []),
    eventListeners: safeParseJson(row.event_listeners_json, []),
    scopeType: row.scope_type,

    // Metadata
    extractedAt: row.extracted_at,
    updatedAt: row.updated_at,
    changeFrequency: row.change_frequency,
    ageDays: row.age_days,
    generation: row.generation,
    _meta: safeParseJson(row._meta_json)
  };
}

// Helper para asegurar valores numericos seguros
export function safeNumber(val, defaultVal = 0) {
  const num = Number(val);
  return Number.isFinite(num) ? num : defaultVal;
}

// Helper para extraer el type del purpose (puede ser string o objeto)
export function safePurpose(purpose) {
  if (!purpose) return null;
  if (typeof purpose === 'string') return purpose;
  if (typeof purpose === 'object' && purpose.type) return purpose.type;
  // Si es objeto sin type, intentar stringify (fallback)
  return String(purpose);
}

// Helper para asegurar strings
export function safeString(val, defaultVal = null) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return String(val);
}

// Helper para booleanos a integer (0/1)
export function safeBoolInt(val) {
  return val ? 1 : 0;
}

// Helper para serializar a JSON de forma segura
export function safeJson(val) {
  try {
    return JSON.stringify(val !== undefined ? val : null);
  } catch (e) {
    return '{}';
  }
}

// Helper para parsear JSON de forma segura
export function safeParseJson(str, defaultValue = null) {
  if (!str || str === '' || str === 'null' || str === 'undefined') {
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(str);
    return parsed;
  } catch (e) {
    return defaultValue;
  }
}
