/**
 * @fileoverview duplicate-dna.js
 *
 * API unificada para detección de duplicados del compilador.
 * Todas las tools/guards que necesiten comparar DNA, calcular hash
 * de duplicados o decidir elegibilidad deben entrar por este módulo
 * para evitar deriva entre watcher, MCP y queries SQLite.
 *
 * @module layer-c-memory/storage/repository/utils/duplicate-dna
 */

export const VALID_DNA_PREDICATE = `dna_json IS NOT NULL AND dna_json != '' AND dna_json != 'null'`;

export const DUPLICATE_ELIGIBLE_PREDICATE = `
  atom_type IN ('function', 'method', 'arrow', 'class')
  AND (is_removed IS NULL OR is_removed = 0)
  AND (is_dead_code IS NULL OR is_dead_code = 0)
  AND file_path LIKE 'src/%'
  AND file_path NOT LIKE 'tests/%'
  AND name NOT GLOB '*_callback'
  AND name NOT GLOB 'anonymous*'
  AND name NOT GLOB 'describe_arg*'
  AND name NOT GLOB 'it_arg*'
  AND name NOT GLOB 'on_arg*'
  AND name NOT GLOB 'then_callback'
  AND name NOT GLOB 'catch_callback'
  AND name NOT GLOB 'map_callback'
  AND name NOT GLOB 'filter_callback'
  AND name NOT GLOB 'some_callback'
  AND name NOT GLOB 'sort_callback'
`;

export const DUPLICATE_DNA_FIELDS = [
  'structuralHash',
  'contextualHash',
  'semanticHash',
  'patternHash',
  'flowType',
  'semanticFingerprint'
];

export const STRUCTURAL_DUPLICATE_DNA_FIELDS = [
  'patternHash',
  'flowType',
  'operationSequence',
  'complexityScore',
  'inputCount',
  'outputCount',
  'transformationCount'
];

export const DUPLICATE_MODES = Object.freeze({
  STRICT: 'strict',
  STRUCTURAL: 'structural'
});

export function normalizeDnaValue(atom = {}) {
  const raw = atom.dna_json ?? atom.dnaJson ?? atom.dna ?? null;
  if (!raw) return null;

  if (typeof raw === 'string') {
    return raw !== 'null' && raw !== '' ? raw : null;
  }

  try {
    return JSON.stringify(raw);
  } catch {
    return null;
  }
}

export function parseDnaValue(dna) {
  if (!dna) return null;
  if (typeof dna === 'string') {
    try {
      return JSON.parse(dna);
    } catch {
      return null;
    }
  }

  return typeof dna === 'object' ? dna : null;
}

export function buildDuplicateKeyFromDna(dna) {
  const parsed = parseDnaValue(dna);
  if (!parsed) return null;

  return DUPLICATE_DNA_FIELDS
    .map((field) => parsed[field] || '')
    .join('|');
}

export function buildStructuralDuplicateKeyFromDna(dna) {
  const parsed = parseDnaValue(dna);
  if (!parsed) return null;

  return STRUCTURAL_DUPLICATE_DNA_FIELDS
    .map((field) => {
      const value = parsed[field];
      if (Array.isArray(value)) return value.join('>');
      return value || '';
    })
    .join('|');
}

export function buildDuplicateKeyForMode(dna, mode = DUPLICATE_MODES.STRICT) {
  if (mode === DUPLICATE_MODES.STRUCTURAL) {
    return buildStructuralDuplicateKeyFromDna(dna);
  }
  return buildDuplicateKeyFromDna(dna);
}

export function getDuplicateKeySql(columnName = 'dna_json') {
  return DUPLICATE_DNA_FIELDS
    .map((field) => `COALESCE(json_extract(${columnName}, '$.${field}'), '')`)
    .join(` || '|' || `);
}

export function getStructuralDuplicateKeySql(columnName = 'dna_json') {
  return STRUCTURAL_DUPLICATE_DNA_FIELDS
    .map((field) => {
      if (field === 'operationSequence') {
        return `COALESCE(REPLACE(REPLACE(REPLACE(REPLACE(json_extract(${columnName}, '$.${field}'), '[', ''), ']', ''), '\"', ''), ',', '>'), '')`;
      }
      return `COALESCE(json_extract(${columnName}, '$.${field}'), '')`;
    })
    .join(` || '|' || `);
}

export function getDuplicateKeySqlForMode(mode = DUPLICATE_MODES.STRICT, columnName = 'dna_json') {
  if (mode === DUPLICATE_MODES.STRUCTURAL) {
    return getStructuralDuplicateKeySql(columnName);
  }
  return getDuplicateKeySql(columnName);
}

export function getDuplicateModeLabel(mode = DUPLICATE_MODES.STRICT) {
  return mode === DUPLICATE_MODES.STRUCTURAL ? 'structural' : 'strict';
}
