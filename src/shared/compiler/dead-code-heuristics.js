/**
 * @fileoverview dead-code-heuristics.js
 *
 * Heurísticas compartidas para identificar funciones huérfanas de alta señal.
 * Se enfocan en funciones/arrows top-level y excluyen callbacks de baja señal,
 * entrypoints y artefactos donde la topología local todavía no permite asegurar
 * dead code con confianza.
 *
 * @module shared/compiler/dead-code-heuristics
 */

const LOW_SIGNAL_PATTERNS = [
  /^anonymous(_\d+)?$/i,
  /^.*_callback$/i,
  /_arg\d+$/i,
  /^(then|catch|map|filter|some|reduce|find)_callback$/i
];

const SQLITE_LOW_SIGNAL_GLOBS = [
  "name NOT GLOB 'anonymous*'",
  "name NOT GLOB '*_callback'",
  "name NOT GLOB '*_arg*'",
  "name NOT GLOB 'then_callback'",
  "name NOT GLOB 'catch_callback'",
  "name NOT GLOB 'map_callback'",
  "name NOT GLOB 'filter_callback'",
  "name NOT GLOB 'some_callback'",
  "name NOT GLOB 'reduce_callback'",
  "name NOT GLOB 'find_callback'"
];

const EXCLUDED_PURPOSES = new Set([
  'ENTRY_POINT',
  'WORKER_ENTRY',
  'SERVER_HANDLER',
  'EVENT_HANDLER',
  'TIMER_ASYNC',
  'NETWORK_HANDLER',
  'SCRIPT_MAIN',
  'ANALYSIS_SCRIPT',
  'TEST_HELPER',
  'FACTORY',
  'WRAPPER'
]);

const EXCLUDED_FILE_PATTERNS = [
  /mcp-.*proxy/i,
  /mcp-.*server/i,
  /mcp-.*bridge/i,
  /error-guardian/i,
  /initialization\/steps/i
];

function asBool(value) {
  return value === true || value === 1 || value === '1';
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || value === '[]') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function isLowSignalDeadCodeName(name = '') {
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(name));
}

export function normalizeDeadCodeAtom(atom = {}) {
  const calledBy = parseArray(atom.calledBy ?? atom.called_by_json);
  const calls = parseArray(atom.calls ?? atom.calls_json);

  return {
    id: atom.id || null,
    name: atom.name || '',
    type: atom.type || atom.atom_type || null,
    purpose: atom.purpose || atom.purpose_type || null,
    filePath: atom.filePath || atom.file_path || '',
    linesOfCode: atom.linesOfCode || atom.lines_of_code || atom.loc || 0,
    isExported: asBool(atom.isExported ?? atom.is_exported),
    isRemoved: asBool(atom.isRemoved ?? atom.is_removed),
    isDeadCode: asBool(atom.isDeadCode ?? atom.is_dead_code),
    isTestCallback: asBool(atom.isTestCallback ?? atom.is_test_callback),
    callersCount: atom.callersCount ?? atom.callers_count ?? calledBy.length ?? 0,
    calleesCount: atom.calleesCount ?? atom.callees_count ?? calls.length ?? 0,
    calledBy,
    calls
  };
}

export function isSuspiciousDeadCodeAtom(atom, options = {}) {
  const {
    minLines = 0,
    allowExported = false
  } = options;

  const normalized = normalizeDeadCodeAtom(atom);

  if (!['function', 'arrow'].includes(normalized.type)) return false;
  if (normalized.isRemoved || normalized.isDeadCode) return false;
  if (normalized.isTestCallback) return false;
  if (normalized.linesOfCode < minLines) return false;
  if (normalized.name === 'constructor') return false;
  if (isLowSignalDeadCodeName(normalized.name)) return false;
  if (EXCLUDED_PURPOSES.has(normalized.purpose)) return false;
  if (EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(normalized.filePath))) return false;
  if (normalized.isExported && !allowExported) return false;
  if (normalized.callersCount > 0 || normalized.calleesCount > 0) return false;
  if (normalized.calledBy.length > 0 || normalized.calls.length > 0) return false;

  return true;
}

export function getDeadCodeSqlPredicate(alias = 'a', { minLines = 0, allowExported = false } = {}) {
  const prefix = `${alias}.`;
  const exportClause = allowExported ? '' : `AND COALESCE(${prefix}is_exported, 0) = 0`;
  const lineClause = minLines > 0 ? `AND COALESCE(${prefix}lines_of_code, 0) >= ${minLines}` : '';
  const excludedPurposes = [...EXCLUDED_PURPOSES].map((value) => `'${value}'`).join(',');
  const lowSignalClause = SQLITE_LOW_SIGNAL_GLOBS
    .map((condition) => condition.replaceAll('name', `${prefix}name`))
    .join('\n          AND ');

  return `
      ${prefix}file_path LIKE 'src/%'
      AND ${prefix}atom_type IN ('function', 'arrow')
      AND (${prefix}is_removed IS NULL OR ${prefix}is_removed = 0)
      AND (${prefix}is_dead_code IS NULL OR ${prefix}is_dead_code = 0)
      AND COALESCE(${prefix}is_test_callback, 0) = 0
      ${exportClause}
      ${lineClause}
      AND (${prefix}purpose_type IS NULL OR ${prefix}purpose_type NOT IN (${excludedPurposes}))
      AND ${lowSignalClause}
      AND COALESCE(${prefix}callers_count, 0) = 0
      AND COALESCE(${prefix}callees_count, 0) = 0
      AND (${prefix}called_by_json IS NULL OR ${prefix}called_by_json = '' OR ${prefix}called_by_json = '[]')
      AND (${prefix}calls_json IS NULL OR ${prefix}calls_json = '' OR ${prefix}calls_json = '[]')
  `;
}
