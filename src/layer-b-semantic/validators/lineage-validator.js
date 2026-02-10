/**
 * @fileoverview Lineage Validator - Valida que los metadatos tengan sentido para lineage
 * 
 * SSOT: Única fuente de validación de metadatos para Shadow Registry.
 * Garantiza que solo metadatos válidos y coherentes entren al sistema.
 * 
 * @module layer-b-semantic/validators/lineage-validator
 */

import { validateDNA } from '../../layer-a-static/extractors/metadata/dna-extractor.js';

/**
 * Resultado de validación
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Si pasa todas las validaciones
 * @property {string} confidence - 'high' | 'medium' | 'low'
 * @property {string[]} errors - Errores críticos
 * @property {string[]} warnings - Advertencias no críticas
 * @property {Object} metadata - Metadatos extraídos si es válido
 */

/**
 * Valida un átomo completo para lineage
 * 
 * @param {Object} atom - Átomo a validar
 * @param {Object} options 
 * @param {boolean} options.strict - Si true, warnings son errores
 * @returns {ValidationResult}
 */
export function validateForLineage(atom, options = {}) {
  const errors = [];
  const warnings = [];
  
  // 1. Validación estructural básica
  if (!atom) {
    return { valid: false, confidence: 'none', errors: ['Atom is null'], warnings: [] };
  }
  
  if (!atom.id) {
    errors.push('Atom missing ID');
  }
  
  if (!atom.name) {
    errors.push('Atom missing name');
  }
  
  // 2. Validar DNA
  if (!atom.dna) {
    errors.push('Atom missing DNA');
  } else {
    const dnaValidation = validateDNA(atom.dna);
    if (!dnaValidation.valid) {
      errors.push(...dnaValidation.errors.map(e => `DNA: ${e}`));
    }
  }
  
  // 3. Validar data flow
  const dataFlowValidation = validateDataFlow(atom.dataFlow);
  if (!dataFlowValidation.valid) {
    errors.push(...dataFlowValidation.errors);
  }
  if (dataFlowValidation.warnings.length > 0) {
    warnings.push(...dataFlowValidation.warnings);
  }
  
  // 4. Validar coherencia entre componentes
  const coherenceValidation = validateCoherence(atom);
  if (!coherenceValidation.valid) {
    errors.push(...coherenceValidation.errors);
  }
  
  // 5. Validar semántica (si existe)
  if (atom.semantic) {
    const semanticValidation = validateSemantic(atom.semantic);
    if (!semanticValidation.valid) {
      warnings.push(...semanticValidation.errors);
    }
  } else {
    warnings.push('Missing semantic analysis');
  }
  
  // Calcular confianza
  const confidence = calculateConfidence(atom, errors, warnings);
  
  // En modo estricto, warnings son errores
  const finalErrors = options.strict ? [...errors, ...warnings] : errors;
  
  return {
    valid: finalErrors.length === 0,
    confidence,
    errors: finalErrors,
    warnings: options.strict ? [] : warnings,
    metadata: finalErrors.length === 0 ? extractMetadata(atom) : null
  };
}

/**
 * Valida estructura de data flow
 */
function validateDataFlow(dataFlow) {
  const errors = [];
  const warnings = [];
  
  if (!dataFlow) {
    return { valid: false, errors: ['Missing dataFlow'], warnings: [] };
  }
  
  // Inputs pueden estar vacíos (funciones sin params)
  if (!Array.isArray(dataFlow.inputs)) {
    errors.push('dataFlow.inputs must be an array');
  }
  
  // Debe tener al menos outputs o transformations
  const hasOutputs = Array.isArray(dataFlow.outputs) && dataFlow.outputs.length > 0;
  const hasTransformations = Array.isArray(dataFlow.transformations) && dataFlow.transformations.length > 0;
  
  if (!hasOutputs && !hasTransformations) {
    warnings.push('Atom has no outputs or transformations (possible void function)');
  }
  
  // Validar que los outputs tengan tipo
  if (hasOutputs) {
    dataFlow.outputs.forEach((output, i) => {
      if (!output.type) {
        warnings.push(`Output ${i} missing type`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Valida coherencia entre DNA, dataFlow y semantic
 */
function validateCoherence(atom) {
  const errors = [];
  
  // Coherencia: si semantic dice "validate", debería tener validación en transformations
  if (atom.semantic?.verb === 'validate' && atom.dataFlow?.transformations) {
    const hasValidation = atom.dataFlow.transformations.some(t => 
      ['validation', 'check', 'verify'].includes(t.operation)
    );
    
    if (!hasValidation) {
      errors.push('Semantic says "validate" but no validation operation found');
    }
  }
  
  // Coherencia: flowType debe coincidir con operaciones
  if (atom.dna?.flowType && atom.dataFlow?.transformations) {
    const operations = atom.dataFlow.transformations.map(t => t.operation);
    
    if (atom.dna.flowType.includes('read') && !operations.some(o => ['read', 'fetch'].includes(o))) {
      errors.push('FlowType says "read" but no read operation found');
    }
    
    if (atom.dna.flowType.includes('persist') && !atom.dataFlow.outputs?.some(o => o.type === 'side_effect')) {
      errors.push('FlowType says "persist" but no side effect output found');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Valida análisis semántico
 */
function validateSemantic(semantic) {
  const errors = [];
  
  if (!semantic.verb) {
    errors.push('Missing semantic verb');
  }
  
  if (!semantic.operationType) {
    errors.push('Missing operationType');
  }
  
  // Verbos conocidos
  const knownVerbs = ['get', 'set', 'update', 'delete', 'validate', 'process', 'handle', 'create', 'fetch'];
  if (semantic.verb && !knownVerbs.includes(semantic.verb)) {
    errors.push(`Unknown verb: ${semantic.verb}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Calcula nivel de confianza en los metadatos
 */
function calculateConfidence(atom, errors, warnings) {
  let score = 100;
  
  // Penalizar errores graves
  score -= errors.length * 30;
  
  // Penalizar warnings
  score -= warnings.length * 10;
  
  // Bonificaciones
  if (atom.dna) score += 10;
  if (atom.semantic) score += 10;
  if (atom.standardized) score += 10;
  
  // Determinar nivel
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Extrae metadatos validados para guardar
 */
function extractMetadata(atom) {
  return {
    id: atom.id,
    name: atom.name,
    dna: atom.dna,
    dataFlow: {
      inputCount: atom.dataFlow?.inputs?.length || 0,
      outputCount: atom.dataFlow?.outputs?.length || 0,
      transformationCount: atom.dataFlow?.transformations?.length || 0,
      flowType: atom.dna?.flowType || 'unknown'
    },
    semantic: atom.semantic ? {
      verb: atom.semantic.verb,
      domain: atom.semantic.domain,
      entity: atom.semantic.entity,
      operationType: atom.semantic.operationType
    } : null,
    filePath: atom.filePath,
    lineNumber: atom.lineNumber,
    isExported: atom.isExported
  };
}

/**
 * Valida que una sombra tenga sentido como antepasado
 * 
 * @param {Object} shadow - Sombra a validar
 * @returns {ValidationResult}
 */
export function validateShadow(shadow) {
  const errors = [];
  
  if (!shadow.shadowId) errors.push('Missing shadowId');
  if (!shadow.originalId) errors.push('Missing originalId');
  if (!shadow.dna) errors.push('Missing DNA');
  if (!shadow.diedAt) errors.push('Missing diedAt timestamp');
  
  // Validar que tenga metadatos mínimos para ser útil
  if (!shadow.metadata) {
    errors.push('Missing metadata');
  }
  
  return {
    valid: errors.length === 0,
    confidence: errors.length === 0 ? 'high' : 'none',
    errors,
    warnings: []
  };
}

/**
 * Valida que un match entre átomo y sombra sea legítimo
 * 
 * @param {Object} atom - Átomo nuevo
 * @param {Object} shadow - Sombra candidata
 * @returns {{valid: boolean, similarity: number, reason: string}}
 */
export function validateMatch(atom, shadow) {
  if (!atom.dna || !shadow.dna) {
    return { valid: false, similarity: 0, reason: 'Missing DNA' };
  }
  
  // Calcular similitud
  const similarity = computeSimilarity(atom.dna, shadow.dna);
  
  // Umbral mínimo
  if (similarity < 0.6) {
    return { valid: false, similarity, reason: 'Similarity below threshold (0.6)' };
  }
  
  // Verificar que no sea un falso positivo (misma estructura, semántica muy diferente)
  if (similarity > 0.8 && atom.semantic && shadow.metadata?.semantic) {
    const verbMatch = atom.semantic.verb === shadow.metadata.semantic.verb;
    const domainDiff = atom.semantic.domain !== shadow.metadata.semantic.domain;
    
    if (!verbMatch && domainDiff) {
      return { 
        valid: false, 
        similarity, 
        reason: 'High structural similarity but different semantics (possible false positive)' 
      };
    }
  }
  
  return { valid: true, similarity, reason: 'Match validated' };
}

function computeSimilarity(dna1, dna2) {
  // Importar desde dna-extractor para consistencia
  const { compareDNA } = require('../../layer-a-static/extractors/metadata/dna-extractor.js');
  return compareDNA(dna1, dna2);
}
