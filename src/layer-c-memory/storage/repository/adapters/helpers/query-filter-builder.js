/**
 * @fileoverview query-filter-builder.js
 *
 * Armado canonico de filtros SQL para consultas sobre atoms.
 */

export function appendAtomQueryFilters(whereClauses, params, filter, normalizeId) {
  appendEqualityFilter(whereClauses, params, filter.filePath, 'file_path = ?');
  appendEqualityFilter(whereClauses, params, filter.atomType, 'atom_type = ?');
  appendEqualityFilter(whereClauses, params, filter.archetype, 'archetype_type = ?');
  appendEqualityFilter(whereClauses, params, filter.purpose, 'purpose_type = ?');
  appendBooleanFilter(whereClauses, params, filter.isExported, 'is_exported = ?');
  appendBooleanFilter(whereClauses, params, filter.isDeadCode, 'is_dead_code = ?');
  appendBoundFilter(whereClauses, params, filter.minComplexity, 'complexity >= ?');
  appendBoundFilter(whereClauses, params, filter.maxComplexity, 'complexity <= ?');

  if (Array.isArray(filter.ids) && filter.ids.length > 0) {
    const normalizedIds = filter.ids.map((id) => normalizeId(id));
    const placeholders = normalizedIds.map(() => '?').join(',');
    whereClauses.push(`id IN (${placeholders})`);
    params.push(...normalizedIds);
  }

  if (filter.name) {
    whereClauses.push('name LIKE ?');
    params.push(`%${filter.name}%`);
  }
}

function appendEqualityFilter(whereClauses, params, value, clause) {
  if (!value) {
    return;
  }

  whereClauses.push(clause);
  params.push(value);
}

function appendBooleanFilter(whereClauses, params, value, clause) {
  if (value === undefined) {
    return;
  }

  whereClauses.push(clause);
  params.push(value ? 1 : 0);
}

function appendBoundFilter(whereClauses, params, value, clause) {
  if (value === undefined) {
    return;
  }

  whereClauses.push(clause);
  params.push(value);
}
