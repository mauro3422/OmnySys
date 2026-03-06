/**
 * @fileoverview converters.js
 * 
 * Funciones de conversiÃ³n entre objetos Atom y filas de SQLite.
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
import { TABLE_DEFINITIONS } from '../../../database/schema-registry.js';

const ATOM_CUSTOM_EXTRACTORS = {
  atom_type: atom => atom.type || atom.atomType || 'function',
  file_path: atom => atom.file || atom.filePath || 'unknown',
  line_start: atom => atom.line || atom.lineStart || 1,
  line_end: atom => atom.endLine || atom.lineEnd || atom.line || (atom.line || atom.lineStart || 1),
  lines_of_code: atom => atom.linesOfCode || ((atom.endLine || atom.lineEnd || atom.line || 1) - (atom.line || atom.lineStart || 1) + 1),
  parameter_count: atom => atom.parameterCount || atom.signature?.params?.length || 0,
  is_exported: atom => atom.exported || atom.isExported,
  is_async: atom => atom.isAsync || atom.async,
  archetype_type: atom => atom.archetype?.type || atom.archetype,
  archetype_severity: atom => atom.archetype?.severity,
  archetype_confidence: atom => atom.archetype?.confidence,
  purpose_type: atom => atom.purpose,
  purpose_confidence: atom => atom.purposeConfidence || atom.purpose?.confidence,
  is_dead_code: atom => atom.isDeadCode || atom.purpose?.isDeadCode,
  is_deprecated: atom => atom.deprecated,
  importance_score: atom => atom.importanceScore || atom.derived?.importanceScore,
  coupling_score: atom => atom.couplingScore || atom.derived?.couplingScore,
  cohesion_score: atom => atom.cohesionScore || atom.derived?.cohesionScore,
  propagation_score: atom => atom.propagationScore || atom.derived?.changeRisk,
  fragility_score: atom => atom.fragilityScore || atom.derived?.fragilityScore,
  testability_score: atom => atom.testabilityScore || atom.derived?.testabilityScore,
  in_degree: atom => atom.inDegree || atom.calledBy?.length,
  out_degree: atom => atom.outDegree || atom.calls?.length,
  callers_count: atom => Math.max(Number(atom.callersCount) || 0, Number(atom.callerCount) || 0, Number(atom.inDegree) || 0, Array.isArray(atom.calledBy) ? atom.calledBy.length : 0),
  callees_count: atom => Math.max(Number(atom.calleesCount) || 0, Number(atom.calleeCount) || 0, Number(atom.outDegree) || 0, Array.isArray(atom.calls) ? atom.calls.length : 0),
  extracted_at: (atom, now) => atom.extractedAt || atom.analyzedAt || now,
  updated_at: (atom, now) => atom.updatedAt || now,
  signature_json: atom => atom.signature || null,
  data_flow_json: atom => atom.dataFlow || atom.data_flow || null,
  calls_json: atom => atom.calls || [],
  temporal_json: atom => atom.temporal || atom.temporalJson || null,
  error_flow_json: atom => atom.errorFlow || atom.error_flow || null,
  performance_json: atom => atom.performance || atom.performanceJson || null,
  dna_json: atom => atom.dna || atom.dnaJson || null,
  derived_json: atom => ({ ...(atom.derived || {}), semantic: atom.semantic || {} }),
  _meta_json: atom => atom._meta || atom.meta,
  shared_state_json: atom => atom.sharedStateAccess || [],
  event_emitters_json: atom => atom.eventEmitters || [],
  event_listeners_json: atom => atom.eventListeners || [],
  called_by_json: atom => atom.calledBy || [],
  function_type: atom => atom.functionType || atom.type || 'declaration'
};

const ATOM_CUSTOM_INJECTORS = {
  line_start: (atom, val) => { atom.line = val; atom.lineStart = val; },
  line_end: (atom, val) => { atom.endLine = val; atom.lineEnd = val; },
  atom_type: (atom, val) => { atom.type = val; },
  file_path: (atom, val) => { atom.filePath = val; },
  parameter_count: (atom, val) => { atom.parameterCount = val; },
  purpose_type: (atom, val) => { atom.purpose = val; },
  signature_json: (atom, val) => { atom.signature = safeParseJson(val, {}); },
  data_flow_json: (atom, val) => { atom.dataFlow = safeParseJson(val); atom.dataFlowJson = atom.dataFlow; },
  calls_json: (atom, val) => { atom.calls = safeParseJson(val, []) || []; },
  called_by_json: (atom, val) => { atom.calledBy = safeParseJson(val, []) || []; },
  temporal_json: (atom, val) => { atom.temporal = safeParseJson(val); atom.temporalJson = atom.temporal; },
  error_flow_json: (atom, val) => { atom.errorFlow = safeParseJson(val); atom.errorFlowJson = atom.errorFlow; },
  performance_json: (atom, val) => { atom.performance = safeParseJson(val); atom.performanceJson = atom.performance; },
  dna_json: (atom, val) => { atom.dna = safeParseJson(val); atom.dnaJson = atom.dna; },
  shared_state_json: (atom, val) => { atom.sharedStateAccess = safeParseJson(val, []) || []; },
  event_emitters_json: (atom, val) => { atom.eventEmitters = safeParseJson(val, []) || []; },
  event_listeners_json: (atom, val) => { atom.eventListeners = safeParseJson(val, []) || []; },
  archetype_type: () => { },
  archetype_severity: () => { },
  archetype_confidence: () => { },
  derived_json: () => { },
  extracted_at: (atom, val) => { atom.extractedAt = val; },
  updated_at: (atom, val) => { atom.updatedAt = val; },
  is_deprecated: (atom, val) => { atom.deprecated = Boolean(val); },
  deprecated_reason: (atom, val) => { atom.deprecatedReason = val; },
  _meta_json: (atom, val) => { atom._meta = safeParseJson(val); }
};

/**
 * Convierte un atomo de la estructura JSON a formato SQLite (Aplanando campos dinÃ¡micamente)
 */
export function atomToRow(atom) {
  const now = new Date().toISOString();
  const row = { id: safeString(atom.id, 'unknown::unknown'), name: safeString(atom.name, 'unknown') };

  for (const col of TABLE_DEFINITIONS.atoms.columns) {
    if (col.name === 'id' || col.name === 'name') continue;

    let val;
    if (ATOM_CUSTOM_EXTRACTORS[col.name]) {
      val = ATOM_CUSTOM_EXTRACTORS[col.name](atom, now);
    } else {
      const camelProp = col.name.replace(/_([a-z])/g, g => g[1].toUpperCase());
      val = atom[camelProp];
    }

    if (col.type === 'BOOLEAN') {
      row[col.name] = safeBoolInt(val);
    } else if (col.type === 'INTEGER' || col.type === 'REAL') {
      row[col.name] = safeNumber(val, col.default || 0);
    } else if (col.type === 'TEXT') {
      if (col.name.endsWith('_json')) row[col.name] = safeJson(val);
      else if (col.name === 'purpose_type') row[col.name] = safePurpose(val);
      else row[col.name] = safeString(val, col.nullable ? null : (col.default || ''));
    }
  }
  return row;
}

/**
 * Convierte una fila de SQLite a estructura de atomo (Rehidratando dinÃ¡micamente)
 */
export function rowToAtom(row) {
  const atom = {
    id: row.id,
    name: row.name,
    archetype: row.archetype_type ? { type: row.archetype_type, severity: row.archetype_severity, confidence: row.archetype_confidence } : null,
    purpose: row.purpose_type,
    derived: safeParseJson(row.derived_json),
    semantic: safeParseJson(row.derived_json)?.semantic || {}
  };

  for (const col of TABLE_DEFINITIONS.atoms.columns) {
    if (col.name === 'id' || col.name === 'name') continue;

    if (ATOM_CUSTOM_INJECTORS[col.name]) {
      ATOM_CUSTOM_INJECTORS[col.name](atom, row[col.name]);
    } else {
      const camelProp = col.name.replace(/_([a-z])/g, g => g[1].toUpperCase());
      if (atom[camelProp] === undefined) {
        if (col.type === 'BOOLEAN') {
          atom[camelProp] = Boolean(row[col.name]);
        } else if (col.name.endsWith('_json')) {
          atom[camelProp] = safeParseJson(row[col.name]);
        } else {
          atom[camelProp] = row[col.name];
        }
      }
    }
  }

  // Custom Fallbacks
  if (!atom.linesOfCode) atom.linesOfCode = atom.lineEnd - atom.lineStart + 1;
  if (!atom.functionType) atom.functionType = 'declaration';

  return atom;
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
  if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('[') || val === 'null')) {
    return val;
  }
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


