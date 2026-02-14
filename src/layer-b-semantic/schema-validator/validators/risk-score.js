/**
 * Risk Score Validator
 */

const VALID_BREAKDOWN_KEYS = [
  'staticComplexity',
  'semanticConnections',
  'hotspotRisk',
  'sideEffectRisk'
];

/**
 * Valida risk score
 * @param {object} riskScore - Risk score a validar
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateRiskScore(riskScore) {
  const errors = [];

  if (!riskScore.total && riskScore.total !== 0) {
    errors.push('Missing required field: total');
  } else if (typeof riskScore.total !== 'number') {
    errors.push(`Invalid total type: ${typeof riskScore.total}. Must be number`);
  } else if (riskScore.total < 0 || riskScore.total > 10) {
    errors.push(`Invalid total value: ${riskScore.total}. Must be 0-10`);
  }

  if (riskScore.breakdown) {
    for (const key of Object.keys(riskScore.breakdown)) {
      if (!VALID_BREAKDOWN_KEYS.includes(key)) {
        errors.push(`Invalid breakdown key: ${key}`);
      }
      const value = riskScore.breakdown[key];
      if (typeof value !== 'number' || value < 0 || value > 10) {
        errors.push(`Invalid breakdown value for ${key}: ${value}. Must be number 0-10`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
