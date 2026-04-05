/**
 * @fileoverview Main DNA Extractor
 * Extracts complete DNA from atoms
 * 
 * SSOT: This is the ONLY place where atom DNA is defined.
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/main-extractor
 */

import {
  computeStructuralHash,
  computeContextualHash,
  computeSemanticHash as computeHashWithFingerprint,
  computePatternHash,
  computeDNAId
} from './hash-computer.js';
import { detectFlowType, extractOperationSequence, computeComplexity } from './flow-analyzer.js';
import { computeSemanticFingerprint } from './semantic-analyzer.js';
import { computeDuplicabilityScore } from './duplicability-scorer.js';

/**
 * Structure of atom DNA
 * @typedef {Object} AtomDNA
 * @property {string} structuralHash - Structure hash (input/output/transformation)
 * @property {string} contextualHash - Structural hash + context (archetype, purpose)
 * @property {string} semanticHash - Structural + context + semantic
 * @property {string} patternHash - Standardized pattern hash
 * @property {string} flowType - Flow type (read-transform-persist, etc.)
 * @property {string[]} operationSequence - Operation sequence
 * @property {number} complexityScore - Complexity (1-10)
 * @property {string} semanticFingerprint - Semantic fingerprint (verb:domain:entity)
 * @property {number} duplicabilityScore - Duplicability score (0-100)
 */

/**
 * Extracts complete DNA from an atom
 * 
 * @param {Object} atom - Atom with metadata
 * @param {Object} atom.dataFlow - Atom's data flow
 * @param {Object} atom.standardized - Standardized version
 * @param {Object} atom.semantic - Semantic analysis
 * @returns {AtomDNA} Atom's DNA
 */
export function extractDNA(atom) {
  if (!atom) {
    return null;
  }

  const hasMinimalDataFlow = atom.dataFlow && (
    Array.isArray(atom.dataFlow.inputs) ||
    Array.isArray(atom.dataFlow.transformations) ||
    Array.isArray(atom.dataFlow.outputs) ||
    atom.dataFlow.graph
  );

  if (!hasMinimalDataFlow) {
    // Structural fallback: use basic atom properties for DNA
    // This ensures every atom has a unique, non-empty DNA
    const structuralSig = [
      atom.name || 'anonymous',
      atom.type || 'function',
      String(atom.complexity || 0),
      String(atom.linesOfCode || 0),
      atom.isAsync ? 'async' : 'sync',
      atom.isExported ? 'exported' : 'private',
      Array.isArray(atom.calls) ? String(atom.calls.length) : '0'
    ].join(':');

    return {
      structuralHash: structuralSig,
      contextualHash: structuralSig,
      semanticHash: structuralSig,
      patternHash: structuralSig,
      flowType: 'unknown',
      operationSequence: [],
      complexityScore: Math.min(10, Math.max(1, Math.round((atom.complexity || 1) / 3))),
      inputCount: 0,
      outputCount: 0,
      transformationCount: 0,
      semanticFingerprint: 'unknown',
      duplicabilityScore: 0,
      extractedAt: new Date().toISOString(),
      version: '2.0',
      id: 'structural:' + structuralSig
    };
  }

  // Compute hierarchical hashes
  const structuralHash = computeStructuralHash(atom.dataFlow);
  const contextualHash = computeContextualHash(atom, structuralHash);
  const semanticHash = computeHashWithFingerprint(atom, contextualHash, computeSemanticFingerprint);

  const dna = {
    // Level 1: Pure structure (for pattern detection)
    structuralHash,

    // Level 2: Structure + Context (for detecting real duplicates)
    contextualHash,

    // Level 3: Structure + Context + Semantic (for exact duplicates)
    semanticHash,

    // Flow pattern (high-level category)
    patternHash: atom.standardized?.patternHash || computePatternHash(atom.dataFlow),
    flowType: detectFlowType(atom.dataFlow),

    // Operation sequence ("signature" of behavior)
    operationSequence: extractOperationSequence(atom.dataFlow),

    // Derived metrics
    complexityScore: computeComplexity(atom.dataFlow),
    inputCount: atom.dataFlow.inputs?.length || 0,
    outputCount: atom.dataFlow.outputs?.length || 0,
    transformationCount: atom.dataFlow.transformations?.length || 0,

    // Semantic fingerprint (for approximate matching)
    semanticFingerprint: computeSemanticFingerprint(atom),

    // Duplicability score (to filter false positives)
    duplicabilityScore: computeDuplicabilityScore(atom),

    // Extraction metadata
    extractedAt: new Date().toISOString(),
    version: '2.0'
  };

  // Unique DNA ID (for traceability)
  dna.id = computeDNAId(dna);

  return dna;
}
