/**
 * @fileoverview Dead-code SQL predicate builders.
 *
 * @module shared/compiler/dead-code-sql
 */

import {
    SQLITE_LOW_SIGNAL_GLOBS,
    EXCLUDED_PURPOSES
} from './dead-code-taxonomy.js';

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
  `;
}
