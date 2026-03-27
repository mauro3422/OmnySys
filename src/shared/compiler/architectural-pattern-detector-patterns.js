/**
 * @fileoverview Individual architectural pattern detectors.
 *
 * @module shared/compiler/architectural-pattern-detector-patterns
 */

import { suggestDirectoryForFile } from './directory-structure-analyzer.js';
import { ARCHITECTURAL_PATTERNS } from './architectural-pattern-detector-constants.js';

export function detectHelperUtilityPattern(fileName, metadata) {
  const name = fileName.toLowerCase();

  const utilityIndicators = [
    name.includes('util'),
    name.includes('helper'),
    name.includes('common'),
    name.includes('shared'),
    metadata.exportCount > 3 && metadata.dependentCount > 5
  ];

  const isUtility = utilityIndicators.filter(Boolean).length >= 2;

  if (isUtility) {
    return {
      pattern: ARCHITECTURAL_PATTERNS.HELPER_UTILITY,
      confidence: 'high',
      suggestedLocation: suggestDirectoryForFile(fileName, 'helper', null),
      recommendation: {
        type: 'move_to_utils',
        message: 'This appears to be a utility helper. Consider moving to /utils/ or /helpers/ directory.',
        suggestedStructure: null
      }
    };
  }

  return null;
}

export function detectPolicyModulePattern(fileName, metadata) {
  const name = fileName.toLowerCase();

  const policyIndicators = [
    name.includes('policy'),
    name.includes('guard'),
    name.includes('rule'),
    name.includes('validator'),
    name.includes('conformance')
  ];

  const isPolicy = policyIndicators.some((indicator) => indicator);

  if (isPolicy) {
    return {
      pattern: ARCHITECTURAL_PATTERNS.POLICY_MODULE,
      confidence: 'high',
      suggestedLocation: suggestDirectoryForFile(fileName, 'policy', null),
      recommendation: {
        type: 'organize_policy',
        message: 'This is a policy/guard module. Consider organizing in /compiler/, /guards/, or /policies/ directory.',
        suggestedStructure: {
          [`${name.replace('.js', '')}/`]: {
            'index.js': 'Barrel exports',
            'detectors.js': 'Detection logic',
            'constants.js': 'Policy constants',
            'utils.js': 'Helper functions'
          }
        }
      }
    };
  }

  return null;
}

export function detectServiceLayerPattern(fileName, metadata) {
  const name = fileName.toLowerCase();

  const serviceIndicators = [
    name.includes('service'),
    name.includes('manager'),
    name.includes('orchestrator'),
    name.includes('coordinator'),
    (metadata.exportCount || 0) > 5 && (metadata.dependentCount || 0) > 3
  ];

  const isService = serviceIndicators.filter(Boolean).length >= 2;

  if (isService) {
    return {
      pattern: ARCHITECTURAL_PATTERNS.SERVICE_LAYER,
      confidence: 'medium',
      suggestedLocation: suggestDirectoryForFile(fileName, 'service', null),
      recommendation: {
        type: 'organize_service',
        message: 'This appears to be a service/manager layer. Consider organizing in /services/ or /core/ directory.',
        suggestedStructure: null
      }
    };
  }

  return null;
}
