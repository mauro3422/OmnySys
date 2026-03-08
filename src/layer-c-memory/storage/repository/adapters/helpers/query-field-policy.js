/**
 * @fileoverview query-field-policy.js
 *
 * Politica canonica para campos permitidos en queries sobre atoms.
 */

const SORT_FIELD_WHITELIST = new Set([
  'id', 'name', 'file_path', 'atom_type', 'complexity',
  'lines_of_code', 'importance_score', 'stability_score',
  'created_at', 'updated_at'
]);

const VECTOR_FIELD_WHITELIST = new Set([
  'complexity', 'lines_of_code', 'importance_score', 'stability_score',
  'propagation_score', 'fragility_score', 'testability_score',
  'cohesion_score', 'coupling_score', 'archetype_weight',
  'change_frequency', 'age_days', 'callers_count', 'callees_count'
]);

export function validateAtomSortField(field, fallback = 'id') {
  return SORT_FIELD_WHITELIST.has(field) ? field : fallback;
}

export function isValidAtomVectorField(field) {
  return VECTOR_FIELD_WHITELIST.has(field);
}
