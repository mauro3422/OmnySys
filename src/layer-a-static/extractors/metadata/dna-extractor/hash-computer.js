/**
 * @fileoverview Hash Computer
 * Computes various hashes for DNA extraction
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/hash-computer
 */

import { createHash } from 'crypto';

/**
 * Computes structural hash from data flow
 * Ignores specific names, only structure
 * @param {Object} dataFlow - Data flow object
 * @returns {string} Structural hash (16 chars)
 */
export function computeStructuralHash(dataFlow) {
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
 * Computes contextual hash (structure + atom context)
 * Includes archetype, purpose, and test callback type to differentiate
 * similar functions in different contexts
 * @param {Object} atom - Atom object
 * @param {string} structuralHash - Pre-computed structural hash
 * @returns {string} Contextual hash (16 chars)
 */
export function computeContextualHash(atom, structuralHash) {
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
 * Computes semantic hash (context + semantic fingerprint)
 * For detecting exact duplicates including meaning
 * @param {Object} atom - Atom object
 * @param {string} contextualHash - Pre-computed contextual hash
 * @param {Function} computeSemanticFingerprint - Function to compute semantic fingerprint
 * @returns {string} Semantic hash (16 chars)
 */
export function computeSemanticHash(atom, contextualHash, computeSemanticFingerprint) {
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
 * Computes pattern hash (simplified version)
 * @param {Object} dataFlow - Data flow object
 * @returns {string} Pattern hash (12 chars)
 */
export function computePatternHash(dataFlow) {
  const operations = (dataFlow.transformations || [])
    .map(t => t.operation || 'unknown')
    .join('→');

  return createHash('sha256')
    .update(operations)
    .digest('hex')
    .substring(0, 12);
}

/**
 * Computes unique DNA ID
 * @param {Object} dna - DNA object
 * @returns {string} DNA ID (16 chars)
 */
export function computeDNAId(dna) {
  return createHash('sha256')
    .update(`${dna.semanticHash}:${dna.patternHash}:${dna.semanticFingerprint}`)
    .digest('hex')
    .substring(0, 16);
}
