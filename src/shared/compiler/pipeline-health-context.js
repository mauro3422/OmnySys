/**
 * @fileoverview Canonical context helpers for pipeline-health coverage checks.
 *
 * Some signals only become meaningful after Phase 2 data has been persisted.
 * This helper keeps the SQL scope and message suffix centralized so MCP health
 * reporting does not re-encode the same contract locally.
 *
 * @module shared/compiler/pipeline-health-context
 */

export function getPipelineFieldCoverageContext(field) {
  if (field === 'has_network_calls') {
    return {
      whereClause: 'WHERE is_phase2_complete = 1',
      descriptionSuffix: ' (Phase 2 atoms only)'
    };
  }

  return {
    whereClause: '',
    descriptionSuffix: ''
  };
}
