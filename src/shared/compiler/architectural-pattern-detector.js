/**
 * @fileoverview architectural-pattern-detector.js
 *
 * Detecta patrones arquitectónicos en archivos y sugiere estructura de carpetas.
 * Combina:
 * - architecture-utils.js (God Object, Orphan Module)
 * - directory-structure-analyzer.js (convenciones de directorios)
 * - architectural-recommendations.js (sugerencias de acción)
 *
 * @module shared/compiler/architectural-pattern-detector
 */

import { createLogger } from '#utils/logger.js';
import {
  detectGodObject,
  detectOrphanModule,
  detectArchitecturalPatterns
} from '../architecture-utils.js';
import {
  suggestDirectoryForFile
} from './directory-structure-analyzer.js';
import {
  resolveArchitecturalRecommendation
} from './architectural-recommendations.js';

const logger = createLogger('OmnySys:ArchitecturalPatternDetector');

/**
 * Patrones arquitectónicos detectables
 */
export const ARCHITECTURAL_PATTERNS = {
  GOD_OBJECT: 'god_object',
  ORPHAN_MODULE: 'orphan_module',
  THIN_COORDINATOR: 'thin_coordinator',
  HELPER_UTILITY: 'helper_utility',
  POLICY_MODULE: 'policy_module',
  SERVICE_LAYER: 'service_layer',
  CONTROLLER_LAYER: 'controller_layer',
  MODEL_LAYER: 'model_layer'
};

/**
 * Detecta patrón arquitectónico de un archivo basado en metadata
 * @param {Object} metadata - Metadata del archivo
 * @returns {Object} Patrón detectado y severidad
 */
export function detectArchitecturalPattern(metadata) {
  const patterns = detectArchitecturalPatterns(metadata);
  
  const result = {
    patterns: [],
    primaryPattern: null,
    severity: 'low',
    recommendations: []
  };

  // God Object
  if (patterns.isGodObject) {
    result.patterns.push(ARCHITECTURAL_PATTERNS.GOD_OBJECT);
    result.primaryPattern = ARCHITECTURAL_PATTERNS.GOD_OBJECT;
    result.severity = 'high';
    result.recommendations.push({
      type: 'split_module',
      message: 'This file has too many responsibilities. Consider splitting into smaller, focused modules.',
      suggestedStructure: buildGodObjectStructure(metadata)
    });
  }

  // Orphan Module
  if (patterns.isOrphanModule) {
    result.patterns.push(ARCHITECTURAL_PATTERNS.ORPHAN_MODULE);
    if (!result.primaryPattern) {
      result.primaryPattern = ARCHITECTURAL_PATTERNS.ORPHAN_MODULE;
    }
    result.severity = result.severity === 'high' ? 'high' : 'medium';
    result.recommendations.push({
      type: 'consolidate_or_remove',
      message: 'This module has exports but no dependents. Consider consolidating or removing.',
      suggestedStructure: null
    });
  }

  // High coupling
  if (patterns.hasHighCoupling) {
    result.patterns.push('high_coupling');
    result.severity = result.severity === 'high' ? 'high' : 'medium';
    result.recommendations.push({
      type: 'reduce_coupling',
      message: 'This file has high coupling. Consider introducing interfaces or dependency injection.',
      suggestedStructure: null
    });
  }

  // Many exports
  if (patterns.hasManyExports) {
    result.patterns.push('many_exports');
    result.recommendations.push({
      type: 'consider_namespace',
      message: 'This file has many exports. Consider using a namespace or barrel export pattern.',
      suggestedStructure: null
    });
  }

  logger.debug(`[detectArchitecturalPattern] ${metadata.filePath || 'unknown'}: ${result.patterns.length} patterns detected`);

  return result;
}

/**
 * Sugiere estructura de carpetas para un God Object
 */
function buildGodObjectStructure(metadata) {
  const fileName = metadata.filePath ? metadata.filePath.split('/').pop() : 'module';
  const baseName = fileName.replace('.js', '');

  return {
    type: 'directory_structure',
    suggestion: `Split ${fileName} into:`,
    structure: {
      [`${baseName}/`]: {
        'index.js': 'Barrel exports (coordinator)',
        'core.js': 'Core business logic',
        'utils.js': 'Helper functions',
        'validators.js': 'Validation logic',
        'handlers.js': 'Event/request handlers'
      }
    },
    principle: 'Single Responsibility Principle + Directory-based modularity'
  };
}

/**
 * Detecta si un archivo es un helper utilitario
 */
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

/**
 * Detecta si un archivo es un policy module
 */
export function detectPolicyModulePattern(fileName, metadata) {
  const name = fileName.toLowerCase();
  
  const policyIndicators = [
    name.includes('policy'),
    name.includes('guard'),
    name.includes('rule'),
    name.includes('validator'),
    name.includes('conformance')
  ];

  const isPolicy = policyIndicators.some(indicator => indicator);

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

/**
 * Detecta si un archivo es un service layer
 */
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

/**
 * Detecta todos los patrones arquitectónicos de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {Object} metadata - Metadata del archivo
 * @returns {Object} Todos los patrones detectados
 */
export function detectAllArchitecturalPatterns(filePath, metadata) {
  const fileName = filePath.split('/').pop();
  
  const results = {
    filePath,
    fileName,
    patterns: [],
    primaryPattern: null,
    severity: 'low',
    recommendations: [],
    suggestedLocation: null
  };

  // Patrón arquitectónico base
  const basePattern = detectArchitecturalPattern(metadata);
  if (basePattern.patterns.length > 0) {
    results.patterns.push(...basePattern.patterns);
    results.primaryPattern = basePattern.primaryPattern;
    results.severity = basePattern.severity;
    results.recommendations.push(...basePattern.recommendations);
  }

  // Helper utility
  const helperPattern = detectHelperUtilityPattern(fileName, metadata);
  if (helperPattern) {
    results.patterns.push(helperPattern.pattern);
    results.suggestedLocation = helperPattern.suggestedLocation;
    results.recommendations.push(helperPattern.recommendation);
  }

  // Policy module
  const policyPattern = detectPolicyModulePattern(fileName, metadata);
  if (policyPattern) {
    results.patterns.push(policyPattern.pattern);
    if (!results.suggestedLocation) {
      results.suggestedLocation = policyPattern.suggestedLocation;
    }
    results.recommendations.push(policyPattern.recommendation);
  }

  // Service layer
  const servicePattern = detectServiceLayerPattern(fileName, metadata);
  if (servicePattern) {
    results.patterns.push(servicePattern.pattern);
    if (!results.suggestedLocation) {
      results.suggestedLocation = servicePattern.suggestedLocation;
    }
    results.recommendations.push(servicePattern.recommendation);
  }

  // Resolver recomendación arquitectónica canónica
  const canonicalRecommendation = resolveArchitecturalRecommendation({
    issueType: results.severity === 'high' ? 'code_complexity_high' : 'code_complexity_medium',
    filePath,
    context: { findings: results.patterns.map(p => ({ rule: p })) },
    operationalRole: { role: classifyOperationalRole(fileName) }
  });

  if (canonicalRecommendation) {
    results.canonicalRecommendation = canonicalRecommendation;
  }

  logger.info(`[detectAllArchitecturalPatterns] ${filePath}: ${results.patterns.length} patterns, severity: ${results.severity}`);

  return results;
}

/**
 * Clasifica rol operacional basado en nombre de archivo
 */
function classifyOperationalRole(fileName) {
  const name = fileName.toLowerCase();
  
  if (name.includes('orchestrator') || name.includes('coordinator')) {
    return 'orchestrator';
  }
  if (name.includes('builder')) {
    return 'builder';
  }
  if (name.includes('analyzer')) {
    return 'analyzer';
  }
  if (name.includes('resolver')) {
    return 'resolver';
  }
  if (name.includes('bridge')) {
    return 'bridge';
  }
  if (name.includes('policy')) {
    return 'policy';
  }
  
  return 'standard';
}

/**
 * Resume patrones detectados en mensaje legible
 */
export function summarizeArchitecturalPatterns(results) {
  if (!results || results.patterns.length === 0) {
    return 'No architectural patterns detected';
  }

  const summaries = [];

  if (results.primaryPattern === ARCHITECTURAL_PATTERNS.GOD_OBJECT) {
    summaries.push('God Object detected - file has too many responsibilities');
  }

  if (results.primaryPattern === ARCHITECTURAL_PATTERNS.ORPHAN_MODULE) {
    summaries.push('Orphan Module detected - exports exist but no dependents');
  }

  if (results.suggestedLocation) {
    summaries.push(`Consider moving to ${results.suggestedLocation}`);
  }

  if (results.canonicalRecommendation) {
    summaries.push(results.canonicalRecommendation.action);
  }

  return summaries.join('. ');
}
