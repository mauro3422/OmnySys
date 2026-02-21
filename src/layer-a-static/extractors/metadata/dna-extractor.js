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
 * @property {string} contextualHash - Hash estructural + contexto (archetype, purpose)
 * @property {string} semanticHash - Hash estructural + contexto + semántica
 * @property {string} patternHash - Hash del patrón estandarizado
 * @property {string} flowType - Tipo de flujo (read-transform-persist, etc.)
 * @property {string[]} operationSequence - Secuencia de operaciones
 * @property {number} complexityScore - Complejidad (1-10)
 * @property {string} semanticFingerprint - Huella semántica (verb+domain+entity)
 * @property {number} duplicabilityScore - Score de qué tan duplicable es (0-100)
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
    const fallbackHash = 'no-dataflow';
    return {
      structuralHash: fallbackHash,
      contextualHash: fallbackHash,
      semanticHash: fallbackHash,
      patternHash: fallbackHash,
      flowType: 'unknown',
      operationSequence: [],
      complexityScore: 1,
      inputCount: 0,
      outputCount: 0,
      transformationCount: 0,
      semanticFingerprint: 'unknown',
      duplicabilityScore: 0, // No duplicable
      extractedAt: new Date().toISOString(),
      version: '2.0',
      id: fallbackHash
    };
  }

  // Calcular hashes jerárquicos
  const structuralHash = computeStructuralHash(atom.dataFlow);
  const contextualHash = computeContextualHash(atom, structuralHash);
  const semanticHash = computeSemanticHash(atom, contextualHash);

  const dna = {
    // Nivel 1: Estructura pura (para detectar patrones)
    structuralHash,

    // Nivel 2: Estructura + Contexto (para detectar duplicados reales)
    contextualHash,

    // Nivel 3: Estructura + Contexto + Semántica (para duplicados exactos)
    semanticHash,

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

    // Score de duplicabilidad (para filtrar falsos positivos)
    duplicabilityScore: computeDuplicabilityScore(atom),

    // Metadatos de extracción
    extractedAt: new Date().toISOString(),
    version: '2.0'
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
 * Computa hash contextual (estructura + contexto del átomo)
 * Incluye archetype, purpose, y test callback type para diferenciar
 * funciones similares en contextos diferentes
 */
function computeContextualHash(atom, structuralHash) {
  const context = {
    structuralHash,
    archetype: atom.archetype?.type || 'unknown',
    archetypeSeverity: atom.archetype?.severity || 0,
    purpose: atom.purpose || 'unknown',
    isTestCallback: atom.isTestCallback || false,
    testCallbackType: atom.testCallbackType || null,
    className: atom.className || null,
    isExported: atom.isExported || false,
    isAsync: atom.isAsync || false
  };

  return createHash('sha256')
    .update(JSON.stringify(context))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Computa hash semántico (contexto + fingerprint semántico)
 * Para detectar duplicados exactos incluyendo significado
 */
function computeSemanticHash(atom, contextualHash) {
  const semantic = {
    contextualHash,
    semanticFingerprint: computeSemanticFingerprint(atom),
    name: atom.name || 'unknown',
    complexity: atom.complexity || 1,
    linesOfCode: atom.linesOfCode || 1
  };

  return createHash('sha256')
    .update(JSON.stringify(semantic))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Computa score de duplicabilidad (0-100)
 * Penaliza patrones legítimos que no son duplicación real
 */
function computeDuplicabilityScore(atom) {
  let score = 100; // Base

  // Penalizar callbacks de test framework (beforeEach, it, describe)
  if (atom.isTestCallback) {
    score -= 60;
    if (atom.testCallbackType === 'beforeEach') score -= 20;
    if (atom.testCallbackType === 'afterEach') score -= 20;
  }

  // Penalizar métodos de clase simples (posible polimorfismo)
  if (atom.archetype?.type === 'class-method' && atom.complexity === 1 && atom.linesOfCode <= 5) {
    score -= 40;
  }

  // Penalizar getters/setters simples
  if (atom.archetype?.type === 'class-method' && atom.name) {
    const name = atom.name.toLowerCase();
    if (name.startsWith('get') || name.startsWith('set') || name.startsWith('is')) {
      if (atom.complexity === 1 && atom.linesOfCode <= 3) {
        score -= 50;
      }
    }
  }

  // Penalizar constructores que solo llaman super()
  if (atom.name === 'constructor' && atom.complexity <= 2 && atom.linesOfCode <= 5) {
    score -= 45;
  }

  // Penalizar helpers de test
  if (atom.purpose === 'TEST_HELPER') {
    score -= 35;
  }

  // Bonificar código de negocio real
  if (atom.purpose === 'API_EXPORT' && atom.isExported) {
    score += 15;
  }

  // Bonificar complejidad moderada-alta (código de negocio)
  if (atom.complexity >= 5) {
    score += 10;
  }

  // Bonificar funciones largas (más probable que sean duplicación real)
  if (atom.linesOfCode > 20) {
    score += 15;
  }

  // Bonificar funciones con side effects (lógica de negocio)
  if (atom.dataFlow?.outputs?.some(o => o.type === 'side_effect')) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
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
    .update(`${dna.semanticHash}:${dna.patternHash}:${dna.semanticFingerprint}`)
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

