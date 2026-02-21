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
 * Usa los nombres de operación reales del sistema (property_access, function_call, etc.)
 */
function detectFlowType(dataFlow) {
  const operations = (dataFlow.transformations || []).map(t => t.operation);

  // "Read" = acceder datos externos, llamar funciones, acceder propiedades
  const READ_OPS = new Set(['property_access', 'array_index_access', 'function_call', 'await_function_call', 'instantiation']);
  // "Transform" = procesar/calcular datos
  const TRANSFORM_OPS = new Set(['binary_operation', 'unary_operation', 'template_literal', 'conditional', 'object_literal', 'array_literal']);
  // "Write" = mutar estado externo
  const WRITE_OPS = new Set(['mutation', 'update']);

  const hasRead = operations.some(o => READ_OPS.has(o));
  const hasTransform = operations.some(o => TRANSFORM_OPS.has(o));
  const hasWrite = (dataFlow.outputs || []).some(o => o.type === 'side_effect' || o.isSideEffect) ||
                   operations.some(o => WRITE_OPS.has(o));
  const hasReturn = (dataFlow.outputs || []).some(o => o.type === 'return');
  const hasThrowOnly = !hasReturn && (dataFlow.outputs || []).some(o => o.type === 'throw');

  if (hasThrowOnly && !hasWrite) return 'guard';
  if (hasRead && hasTransform && hasWrite && hasReturn) return 'read-transform-persist-return';
  if (hasRead && hasTransform && hasReturn) return 'read-transform-return';
  if (hasRead && hasWrite && hasReturn) return 'read-persist-return';
  if (hasRead && hasWrite) return 'read-persist';
  if (hasTransform && hasReturn) return 'transform-return';
  if (hasRead && hasReturn) return 'read-return';
  if (hasWrite) return 'side-effect-only';
  if (hasReturn) return 'passthrough';

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
 * Computa huella semántica para matching aproximado.
 * Si hay análisis semántico LLM lo usa directamente.
 * Si no, deriva verb/domain/entity desde nombre + metadata estática.
 */
function computeSemanticFingerprint(atom) {
  if (atom.semantic?.verb && atom.semantic.verb !== 'unknown') {
    return [atom.semantic.verb, atom.semantic.domain || 'unknown', atom.semantic.entity || 'unknown'].join(':');
  }

  // Derivar desde nombre del átomo
  const name = atom.name || '';
  const verb = deriveVerb(name);
  const domain = deriveDomain(atom);
  const entity = deriveEntity(name, verb);

  return `${verb}:${domain}:${entity}`;
}

/**
 * Extrae el verbo semántico del nombre de la función
 */
function deriveVerb(name) {
  const verbPrefixes = [
    'get', 'set', 'fetch', 'load', 'save', 'update', 'delete', 'remove',
    'create', 'build', 'make', 'generate', 'compute', 'calculate', 'parse',
    'format', 'transform', 'convert', 'extract', 'detect', 'analyze',
    'validate', 'check', 'verify', 'resolve', 'init', 'start', 'stop',
    'run', 'execute', 'process', 'handle', 'register', 'index', 'scan',
    'search', 'find', 'filter', 'sort', 'merge', 'apply', 'emit', 'send',
    'read', 'write', 'render', 'encode', 'decode', 'serialize', 'normalize'
  ];

  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  for (const v of verbPrefixes) {
    if (lower.startsWith(v) && lower.length > v.length) return v;
    if (lower === v) return v;
  }
  return 'process';
}

/**
 * Deriva el dominio desde el propósito, archetype y callerPattern del átomo
 */
function deriveDomain(atom) {
  const purpose = atom.purpose || '';
  if (purpose === 'API_EXPORT') return 'api';
  if (purpose === 'INTERNAL_HELPER') return 'internal';
  if (purpose === 'TEST_HELPER') return 'test';
  if (purpose === 'CONFIG') return 'config';

  const flowType = atom.dataFlow?.flowType || '';
  if (flowType.includes('read')) return 'io';
  if (flowType.includes('persist')) return 'persistence';
  if (flowType.includes('transform')) return 'transform';

  return 'core';
}

/**
 * Deriva la entidad principal desde el nombre (lo que viene después del verbo)
 */
function deriveEntity(name, verb) {
  if (!name || !verb) return 'unknown';
  // Quitar el verbo del inicio y tomar lo que queda en camelCase
  const rest = name.startsWith(verb)
    ? name.slice(verb.length)
    : name;
  if (!rest) return 'unknown';
  // Separar camelCase en tokens y tomar el último (la entidad)
  const tokens = rest.replace(/([A-Z])/g, ' $1').trim().split(/\s+/);
  return tokens[tokens.length - 1].toLowerCase() || 'unknown';
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

