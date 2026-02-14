/**
 * Connection Validator
 * Validates semantic connections
 */

const VALID_TYPES = [
  'shared_state',
  'event_listener',
  'callback',
  'side_effect',
  'global_access',
  'mutation'
];

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Valida una conexión semántica
 * @param {object} connection - Conexión a validar
 * @param {number} minConfidence - Confidence mínima (0-1)
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateSemanticConnection(connection, minConfidence = 0.7) {
  const errors = [];

  // Required fields
  if (!connection.id) errors.push('Missing required field: id');
  if (!connection.type) errors.push('Missing required field: type');
  if (!connection.target) errors.push('Missing required field: target');
  if (!connection.reason) errors.push('Missing required field: reason');
  if (connection.confidence === undefined) errors.push('Missing required field: confidence');

  // Type validation
  if (connection.type && !VALID_TYPES.includes(connection.type)) {
    errors.push(`Invalid type: ${connection.type}. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // Confidence validation
  if (connection.confidence !== undefined) {
    if (typeof connection.confidence !== 'number') {
      errors.push(`Invalid confidence type: ${typeof connection.confidence}. Must be number`);
    } else if (connection.confidence < 0 || connection.confidence > 1) {
      errors.push(`Invalid confidence value: ${connection.confidence}. Must be 0-1`);
    } else if (connection.confidence < minConfidence) {
      errors.push(`Low confidence: ${connection.confidence} < ${minConfidence}`);
    }
  }

  // Severity validation
  if (connection.severity && !VALID_SEVERITIES.includes(connection.severity)) {
    errors.push(`Invalid severity: ${connection.severity}. Must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
