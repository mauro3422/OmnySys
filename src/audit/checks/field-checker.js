/**
 * @fileoverview Field Checker
 * 
 * Validates required fields in analysis data
 * 
 * @module audit/checks/field-checker
 */

import { REQUIRED_FIELDS } from '../constants.js';

/**
 * Check fields in data
 * @param {Object} data - Analysis data
 * @returns {Object} Check result
 */
export function checkFields(data) {
  const result = {
    missingFields: [],
    presentFields: [],
    score: 0,
    maxScore: 0
  };

  // Check basic fields
  for (const field of REQUIRED_FIELDS.basic) {
    result.maxScore++;
    if (data[field] !== undefined) {
      result.presentFields.push(field);
      result.score++;
    } else {
      result.missingFields.push(field);
    }
  }

  // Check metadata fields
  if (data.metadata) {
    for (const field of REQUIRED_FIELDS.metadata) {
      result.maxScore++;
      if (data.metadata[field] !== undefined) {
        result.presentFields.push(`metadata.${field}`);
        result.score++;
      } else {
        result.missingFields.push(`metadata.${field}`);
      }
    }
  }

  // Check LLM fields
  if (data.analysis) {
    for (const field of REQUIRED_FIELDS.llm) {
      result.maxScore++;
      if (data.analysis[field] !== undefined) {
        result.presentFields.push(`analysis.${field}`);
        result.score++;
      } else {
        result.missingFields.push(`analysis.${field}`);
      }
    }
  }

  // Check quality fields
  if (data.quality) {
    for (const field of REQUIRED_FIELDS.quality) {
      result.maxScore++;
      if (data.quality[field] !== undefined) {
        result.presentFields.push(`quality.${field}`);
        result.score++;
      } else {
        result.missingFields.push(`quality.${field}`);
      }
    }
  }

  // Check semantic fields
  if (data.semantic) {
    for (const field of REQUIRED_FIELDS.semantic) {
      result.maxScore++;
      if (data.semantic[field] !== undefined) {
        result.presentFields.push(`semantic.${field}`);
        result.score++;
      } else {
        result.missingFields.push(`semantic.${field}`);
      }
    }
  }

  return result;
}

/**
 * Calculate completeness score
 * @param {Object} checkResult - Field check result
 * @returns {number} Score (0-100)
 */
export function calculateCompletenessScore(checkResult) {
  if (checkResult.maxScore === 0) return 0;
  return Math.round((checkResult.score / checkResult.maxScore) * 100);
}
