/**
 * @fileoverview duplicate-dna.js
 *
 * Helper unificado para construir y consultar claves de duplicados
 * basadas en DNA persistido de átomos.
 *
 * @module layer-c-memory/storage/repository/utils/duplicate-dna
 */

export const VALID_DNA_PREDICATE = `dna_json IS NOT NULL AND dna_json != '' AND dna_json != 'null'`;

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
