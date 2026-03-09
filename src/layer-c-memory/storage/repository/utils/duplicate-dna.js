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

export const DEFAULT_DUPLICATE_ATOM_TYPES = Object.freeze([
  'function',
  'method',
  'arrow',
  'class'
]);

const TEST_FILE_EXCLUSION_PATTERNS = Object.freeze([
  "%.test.js",
  "%.spec.js",
  "%/test/%",
  "%/tests/%"
]);

const NORMALIZED_TEST_FILE_EXCLUSION_FRAGMENTS = Object.freeze(
  TEST_FILE_EXCLUSION_PATTERNS
    .map((pattern) => pattern.replace(/%/g, '').replace(/^\//, '').replace(/\/$/, ''))
    .filter(Boolean)
);

const EXCLUDED_DUPLICATE_NAME_PATTERNS = Object.freeze([
  /_callback$/,
  /^anonymous/,
  /^describe_arg/,
  /^it_arg/,
  /^on_arg/,
  /^then_callback$/,
  /^catch_callback$/,
  /^map_callback$/,
  /^filter_callback$/,
  /^some_callback$/,
  /^sort_callback$/
]);

function qualifyColumn(columnName = '', alias = '') {
  return alias ? `${alias}.${columnName}` : columnName;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

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

export function getValidDnaPredicate(columnName = 'dna_json') {
  return VALID_DNA_PREDICATE.replaceAll('dna_json', columnName);
}

export function getDuplicateEligiblePredicate({
  filePathColumn = 'file_path',
  atomTypeColumn = 'atom_type',
  removedColumn = 'is_removed',
  deadColumn = 'is_dead_code'
} = {}) {
  return `
  ${atomTypeColumn} IN ('function', 'method', 'arrow', 'class')
  AND (${removedColumn} IS NULL OR ${removedColumn} = 0)
  AND (${deadColumn} IS NULL OR ${deadColumn} = 0)
  AND ${filePathColumn} LIKE 'src/%'
  AND ${filePathColumn} NOT LIKE 'tests/%'
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
}

export function getDuplicateScopeClauses({
  alias = '',
  excludeTests = true,
  atomTypes = DEFAULT_DUPLICATE_ATOM_TYPES,
  minLines = 0,
  requireValidDna = false,
  eligibleOnly = false,
  includeRemoved = false,
  includeDeadCode = false,
  sourceOnly = false
} = {}) {
  const filePathColumn = qualifyColumn('file_path', alias);
  const atomTypeColumn = qualifyColumn('atom_type', alias);
  const removedColumn = qualifyColumn('is_removed', alias);
  const deadColumn = qualifyColumn('is_dead_code', alias);
  const linesColumn = qualifyColumn('lines_of_code', alias);
  const dnaColumn = qualifyColumn('dna_json', alias);
  const clauses = [];

  if (requireValidDna) {
    clauses.push(getValidDnaPredicate(dnaColumn));
  }

  if (eligibleOnly) {
    clauses.push(getDuplicateEligiblePredicate({
      filePathColumn,
      atomTypeColumn,
      removedColumn,
      deadColumn
    }).trim());
  } else {
    if (!includeRemoved) {
      clauses.push(`(${removedColumn} IS NULL OR ${removedColumn} = 0)`);
    }
    if (!includeDeadCode) {
      clauses.push(`(${deadColumn} IS NULL OR ${deadColumn} = 0)`);
    }
    if (sourceOnly) {
      clauses.push(`${filePathColumn} LIKE 'src/%'`);
    }
    if (atomTypes && atomTypes.length > 0) {
      clauses.push(`${atomTypeColumn} IN (${atomTypes.map(sqlQuote).join(', ')})`);
    }
    if (excludeTests) {
      clauses.push(...TEST_FILE_EXCLUSION_PATTERNS.map((pattern) => `${filePathColumn} NOT LIKE ${sqlQuote(pattern)}`));
    }
  }

  if (minLines > 0) {
    clauses.push(`(${linesColumn} IS NULL OR ${linesColumn} >= ${Number(minLines) || 0})`);
  }

  return clauses;
}

export function buildDuplicateWhereSql(options = {}) {
  const clauses = getDuplicateScopeClauses(options);
  return clauses.length > 0 ? `WHERE ${clauses.join('\n  AND ')}` : '';
}

export function isDuplicateEligibleAtom(atom = {}, {
  excludeTests = true,
  atomTypes = DEFAULT_DUPLICATE_ATOM_TYPES,
  minLines = 0,
  requireDna = false
} = {}) {
  const atomType = atom.type || atom.atom_type || null;
  const filePath = (atom.file_path || atom.filePath || '').replace(/\\/g, '/');
  const linesOfCode = Number(atom.lines_of_code || atom.linesOfCode || atom.loc || 0);
  const isRemoved = Boolean(atom.isRemoved || atom.is_removed);
  const isDeadCode = Boolean(atom.isDeadCode || atom.is_dead_code);
  const dnaValue = normalizeDnaValue(atom);
  const name = atom.name || '';
  const checks = [
    !requireDna || Boolean(dnaValue),
    !isRemoved,
    !isDeadCode,
    !atomTypes || atomTypes.length === 0 || atomTypes.includes(atomType),
    minLines <= 0 || linesOfCode >= minLines,
    !filePath || filePath.startsWith('src/'),
    !filePath || !filePath.startsWith('tests/'),
    !excludeTests || !NORMALIZED_TEST_FILE_EXCLUSION_FRAGMENTS.some((fragment) => filePath.includes(fragment)),
    !EXCLUDED_DUPLICATE_NAME_PATTERNS.some((pattern) => pattern.test(name))
  ];

  return checks.every(Boolean);
}

export function normalizeDuplicateCandidateAtom(atom = {}, {
  mode = DUPLICATE_MODES.STRICT,
  excludeTests = true,
  atomTypes = DEFAULT_DUPLICATE_ATOM_TYPES,
  minLines = 0,
  requireDna = true
} = {}) {
  if (!isDuplicateEligibleAtom(atom, { excludeTests, atomTypes, minLines, requireDna })) {
    return null;
  }

  const dnaJson = normalizeDnaValue(atom);
  const duplicateKey = buildDuplicateKeyForMode(atom.dna ?? atom.dnaJson ?? atom.dna_json, mode);
  if (!duplicateKey) return null;

  return {
    id: atom.id,
    name: atom.name,
    file_path: atom.file_path || atom.filePath || null,
    atom_type: atom.type || atom.atom_type || null,
    lines_of_code: Number(atom.lines_of_code || atom.linesOfCode || atom.loc || 0),
    dna_json: dnaJson,
    duplicate_key: duplicateKey
  };
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
