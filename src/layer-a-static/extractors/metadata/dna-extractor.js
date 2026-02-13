/**
 * @fileoverview DNA Extractor - Extracción del ADN estructural de átomos
 * 
 * El "ADN" es el fingerprint único de un átomo que permite identificarlo
 * a través de su evolución (cambios de nombre, refactor, etc.)
 * 
 * SSOT: Este es el ÚNICO lugar donde se define qué constituye el ADN de un átomo.
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor
 */

import { createHash } from 'crypto';

/**
 * Estructura del ADN de un átomo
 * @typedef {Object} AtomDNA
 * @property {string} structuralHash - Hash de la estructura (input/output/transformation)
 * @property {string} patternHash - Hash del patrón estandarizado
 * @property {string} flowType - Tipo de flujo (read-transform-persist, etc.)
 * @property {string[]} operationSequence - Secuencia de operaciones
 * @property {number} complexityScore - Complejidad (1-10)
 * @property {string} semanticFingerprint - Huella semántica (verb+domain+entity)
 */

/**
 * Extrae el ADN completo de un átomo
 * 
 * @param {Object} atom - Átomo con metadata
 * @param {Object} atom.dataFlow - Data flow del átomo
 * @param {Object} atom.standardized - Versión estandarizada
 * @param {Object} atom.semantic - Análisis semántico
 * @returns {AtomDNA} ADN del átomo
 */
export function extractDNA(atom) {
  if (!atom || !atom.dataFlow) {
    // Graceful fallback for atoms without dataFlow (e.g., config files, simple exports)
    return {
      structuralHash: 'no-dataflow',
      patternHash: 'no-dataflow',
      flowType: 'unknown',
      operationSequence: [],
      complexityScore: 1,
      inputCount: 0,
      outputCount: 0,
      transformationCount: 0,
      semanticFingerprint: 'unknown',
      extractedAt: new Date().toISOString(),
      version: '1.0',
      id: 'no-dataflow'
    };
  }

  const dna = {
    // Identidad estructural (inmutable ante cambios de nombre)
    structuralHash: computeStructuralHash(atom.dataFlow),

    // Patrón de flujo (categoría alta)
    patternHash: atom.standardized?.patternHash || computePatternHash(atom.dataFlow),
    flowType: detectFlowType(atom.dataFlow),

    // Secuencia de operaciones ("firma" del comportamiento)
    operationSequence: extractOperationSequence(atom.dataFlow),

    // Métricas derivadas
    complexityScore: computeComplexity(atom.dataFlow),
    inputCount: atom.dataFlow.inputs?.length || 0,
    outputCount: atom.dataFlow.outputs?.length || 0,
    transformationCount: atom.dataFlow.transformations?.length || 0,

    // Huella semántica (para matching aproximado)
    semanticFingerprint: computeSemanticFingerprint(atom),

    // Metadatos de extracción
    extractedAt: new Date().toISOString(),
    version: '1.0'
  };

  // ID único del ADN (para trazabilidad)
  dna.id = computeDNAId(dna);

  return dna;
}

/**
 * Computa hash estructural del data flow
 * Ignora nombres específicos, solo estructura
 */
function computeStructuralHash(dataFlow) {
  const structure = {
    inputs: (dataFlow.inputs || []).map(i => ({
      type: i.type || 'unknown',
      usagePattern: (i.usages || []).map(u => u.type).sort()
    })),
    transformations: (dataFlow.transformations || []).map(t => ({
      operation: t.operation || 'unknown',
      arity: Array.isArray(t.from) ? t.from.length : 1
    })),
    outputs: (dataFlow.outputs || []).map(o => ({
      type: o.type || 'unknown',
      hasSideEffect: o.type === 'side_effect'
    }))
  };

  return createHash('sha256')
    .update(JSON.stringify(structure))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Computa hash de patrón (versión simplificada)
 */
function computePatternHash(dataFlow) {
  const operations = (dataFlow.transformations || [])
    .map(t => t.operation || 'unknown')
    .join('→');

  return createHash('sha256')
    .update(operations)
    .digest('hex')
    .substring(0, 12);
}

/**
 * Detecta el tipo de flujo de datos
 */
function detectFlowType(dataFlow) {
  const operations = (dataFlow.transformations || []).map(t => t.operation);
  const hasRead = operations.some(o => ['read', 'fetch', 'query'].includes(o));
  const hasTransform = operations.some(o => ['calculation', 'arithmetic', 'merge'].includes(o));
  const hasWrite = (dataFlow.outputs || []).some(o => o.type === 'side_effect');
  const hasReturn = (dataFlow.outputs || []).some(o => o.type === 'return');

  if (hasRead && hasTransform && hasWrite && hasReturn) return 'read-transform-persist-return';
  if (hasRead && hasTransform && hasReturn) return 'read-transform-return';
  if (hasRead && hasWrite) return 'read-persist';
  if (hasTransform && hasReturn) return 'transform-return';
  if (hasRead && hasReturn) return 'read-return';
  if (hasWrite) return 'side-effect-only';

  return 'unknown';
}

/**
 * Extrae secuencia de operaciones en orden
 */
function extractOperationSequence(dataFlow) {
  const sequence = [];

  // Inputs
  if (dataFlow.inputs?.length > 0) {
    sequence.push('receive');
  }

  // Transformaciones en orden
  (dataFlow.transformations || []).forEach(t => {
    sequence.push(t.operation || 'transform');
  });

  // Outputs
  (dataFlow.outputs || []).forEach(o => {
    if (o.type === 'side_effect') sequence.push('emit');
    if (o.type === 'return') sequence.push('return');
  });

  return sequence;
}

/**
 * Computa score de complejidad (1-10)
 */
function computeComplexity(dataFlow) {
  let score = 1;

  // +1 por cada input
  score += (dataFlow.inputs?.length || 0) * 0.5;

  // +1 por cada transformación
  score += (dataFlow.transformations?.length || 0) * 0.8;

  // +1 por cada output
  score += (dataFlow.outputs?.length || 0) * 0.5;

  // +2 si tiene side effects
  if ((dataFlow.outputs || []).some(o => o.type === 'side_effect')) {
    score += 2;
  }

  return Math.min(10, Math.round(score));
}

/**
 * Computa huella semántica para matching aproximado
 */
function computeSemanticFingerprint(atom) {
  if (!atom.semantic) return 'unknown';

  const parts = [
    atom.semantic.verb || 'unknown',
    atom.semantic.domain || 'unknown',
    atom.semantic.entity || 'unknown'
  ];

  return parts.join(':');
}

/**
 * Computa ID único del ADN
 */
function computeDNAId(dna) {
  return createHash('sha256')
    .update(`${dna.structuralHash}:${dna.patternHash}:${dna.semanticFingerprint}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Compara dos ADNs y retorna similitud (0-1)
 * 
 * @param {AtomDNA} dna1 
 * @param {AtomDNA} dna2 
 * @returns {number} Similitud entre 0 y 1
 */
export function compareDNA(dna1, dna2) {
  if (!dna1 || !dna2) return 0;

  let score = 0;
  let weights = 0;

  // Estructural (40%)
  if (dna1.structuralHash === dna2.structuralHash) {
    score += 0.4;
  }
  weights += 0.4;

  // Pattern (30%)
  if (dna1.patternHash === dna2.patternHash) {
    score += 0.3;
  } else if (dna1.flowType === dna2.flowType) {
    score += 0.15; // Mitad si mismo flow type pero diferente hash
  }
  weights += 0.3;

  // Operaciones (20%)
  const ops1 = dna1.operationSequence.join(',');
  const ops2 = dna2.operationSequence.join(',');
  if (ops1 === ops2) {
    score += 0.2;
  } else if (dna1.operationSequence.length === dna2.operationSequence.length) {
    score += 0.1;
  }
  weights += 0.2;

  // Semántico (10%)
  if (dna1.semanticFingerprint === dna2.semanticFingerprint) {
    score += 0.1;
  }
  weights += 0.1;

  return weights > 0 ? score / weights : 0;
}

/**
 * Valida que el ADN tenga sentido
 * 
 * @param {AtomDNA} dna 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateDNA(dna) {
  const errors = [];

  if (!dna.id) errors.push('Missing DNA ID');
  if (!dna.structuralHash) errors.push('Missing structural hash');
  if (!dna.patternHash) errors.push('Missing pattern hash');
  if (!dna.flowType || dna.flowType === 'unknown') errors.push('Unknown flow type');
  if (dna.complexityScore < 1 || dna.complexityScore > 10) {
    errors.push('Invalid complexity score');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

class DNAExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DNAExtractionError';
  }
}
