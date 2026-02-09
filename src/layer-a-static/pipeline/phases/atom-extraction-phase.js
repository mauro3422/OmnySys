/**
 * @fileoverview atom-extraction-phase.js
 *
 * Phase 1: Extract atoms (functions) from source code
 * Creates atomic metadata for each function in the file
 *
 * @module pipeline/phases/atom-extraction-phase
 */

import { ExtractionPhase } from './base-phase.js';
import { extractSideEffects } from '../extractors/metadata/side-effects.js';
import { extractCallGraph } from '../extractors/metadata/call-graph.js';
import { extractDataFlow as extractDataFlowV2 } from '../extractors/data-flow-v2/core/index.js';
import { extractTypeInference } from '../extractors/metadata/type-inference.js';
import { extractTemporalPatterns } from '../extractors/metadata/temporal-patterns.js';
import { extractPerformanceHints } from '../extractors/metadata/performance-hints.js';
import { logger } from '../../utils/logger.js';

/**
 * Phase 1: Extract atomic metadata from functions
 */
export class AtomExtractionPhase extends ExtractionPhase {
  constructor() {
    super('atom-extraction');
  }

  /**
   * Execute atom extraction
   * @param {Object} context - Extraction context
   * @param {string} context.filePath - File path
   * @param {string} context.code - Source code
   * @param {Object} context.fileInfo - Parsed file info with functions
   * @param {Object} context.fileMetadata - File-level metadata
   * @returns {Promise<Object>} - Context with extracted atoms
   */
  async execute(context) {
    const { filePath, code, fileInfo, fileMetadata } = context;

    logger.debug(`Phase 1: Extracting atoms from ${filePath}`);

    // Extract atoms (functions)
    const atoms = await this.extractAtoms(fileInfo, code, fileMetadata, filePath);

    // Build call graph relationships
    this.buildCallGraph(atoms);

    // Recalculate archetypes with calledBy info
    this.recalculateArchetypes(atoms);

    context.atoms = atoms;
    context.atomCount = atoms.length;

    logger.debug(`Phase 1: Extracted ${atoms.length} atoms`);

    return context;
  }

  /**
   * Extract metadata for all atoms
   * @private
   */
  async extractAtoms(fileInfo, code, fileMetadata, filePath) {
    return Promise.all(
      (fileInfo.functions || []).map(async (functionInfo) => {
        const functionCode = this.extractFunctionCode(code, functionInfo);
        return this.extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath);
      })
    );
  }

  /**
   * Extract code for a single function
   * @private
   */
  extractFunctionCode(fullCode, functionInfo) {
    const lines = fullCode.split('\n');
    const startLine = Math.max(0, functionInfo.line - 1);
    const endLine = Math.min(lines.length, functionInfo.endLine);
    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Extract metadata for a single atom
   * @private
   */
  async extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath) {
    // Extract various metadata aspects
    const sideEffects = extractSideEffects(functionCode);
    const callGraph = extractCallGraph(functionCode);
    const typeInference = extractTypeInference(functionCode);
    const temporal = extractTemporalPatterns(functionCode);
    const performance = extractPerformanceHints(functionCode);

    // Data flow analysis (optional, may fail gracefully)
    let dataFlowV2 = null;
    try {
      const functionAst = functionInfo.node || functionInfo.ast;
      if (functionAst) {
        dataFlowV2 = await extractDataFlowV2(
          functionAst,
          functionCode,
          functionInfo.name,
          filePath
        );
      }
    } catch (error) {
      logger.warn(`Data flow extraction failed for ${functionInfo.name}: ${error.message}`);
    }

    // Calculate metrics
    const complexity = this.calculateComplexity(functionCode);
    const linesOfCode = functionCode.split('\n').length;

    // Build atom metadata
    const atomMetadata = {
      // Identity
      id: functionInfo.id,
      name: functionInfo.name,
      type: 'atom',
      line: functionInfo.line,
      endLine: functionInfo.endLine,
      linesOfCode,

      // Export status
      isExported: functionInfo.isExported,

      // Complexity
      complexity,

      // Side effects
      hasSideEffects: sideEffects.all.length > 0,
      hasNetworkCalls: sideEffects.networkCalls.length > 0,
      hasDomManipulation: sideEffects.domManipulations.length > 0,
      hasStorageAccess: sideEffects.storageAccess.length > 0,
      hasLogging: sideEffects.consoleUsage.length > 0,
      networkEndpoints: sideEffects.networkCalls.map(c => c.url || c.endpoint).filter(Boolean),

      // Call graph
      calls: functionInfo.calls || [],
      internalCalls: callGraph.internalCalls || [],
      externalCalls: callGraph.externalCalls || [],
      externalCallCount: (callGraph.externalCalls || []).length,

      // Error handling
      hasErrorHandling: /try\s*\{/.test(functionCode) || /if\s*\(.*\)\s*throw/.test(functionCode),

      // Async
      isAsync: functionInfo.isAsync || /async\s+function/.test(functionCode) || /await\s+/.test(functionCode),

      // Temporal
      hasLifecycleHooks: temporal.lifecycleHooks.length > 0,
      lifecycleHooks: temporal.lifecycleHooks,
      hasCleanupPatterns: temporal.cleanupPatterns.length > 0,

      // Performance
      hasNestedLoops: performance.nestedLoops.length > 0,
      hasBlockingOps: performance.blockingOperations.length > 0,

      // Data flow
      dataFlow: dataFlowV2?.real || null,
      standardized: dataFlowV2?.standardized || null,
      patternHash: dataFlowV2?.standardized?.patternHash || null,
      invariants: dataFlowV2?.real?.invariants || [],
      typeFlow: dataFlowV2?.real?.typeFlow || null,

      // Metadata
      _meta: {
        dataFlowVersion: '2.0.0',
        extractionTime: dataFlowV2?._meta?.processingTime || 0,
        confidence: dataFlowV2?._meta?.confidence || 0.5
      }
    };

    // Detect archetype
    atomMetadata.archetype = this.detectAtomArchetype(atomMetadata);

    return atomMetadata;
  }

  /**
   * Calculate cyclomatic complexity
   * @private
   */
  calculateComplexity(code) {
    let complexity = 1;
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?.*:/g
    ];

    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    return complexity;
  }

  /**
   * Detect atom archetype
   * @private
   */
  detectAtomArchetype(atomMetadata) {
    const { complexity, hasSideEffects, hasNetworkCalls, externalCallCount, linesOfCode, isExported, calledBy } = atomMetadata;
    const callerCount = calledBy?.length || 0;

    if (complexity > 20 && (externalCallCount > 5 || callerCount > 10)) {
      return { type: 'god-function', severity: 10, confidence: 1.0 };
    }

    if (hasNetworkCalls && !atomMetadata.hasErrorHandling) {
      return { type: 'fragile-network', severity: 8, confidence: 0.9 };
    }

    if (isExported && callerCount > 5 && complexity < 15) {
      return { type: 'hot-path', severity: 7, confidence: 0.9 };
    }

    if (!isExported && callerCount === 0) {
      return { type: 'dead-function', severity: 5, confidence: 1.0 };
    }

    if (!isExported && callerCount > 0 && !hasSideEffects && complexity < 10) {
      return { type: 'private-utility', severity: 3, confidence: 0.9 };
    }

    if (!hasSideEffects && complexity < 5 && linesOfCode < 20) {
      return { type: 'utility', severity: 2, confidence: 1.0 };
    }

    return { type: 'standard', severity: 1, confidence: 1.0 };
  }

  /**
   * Build call graph (internal/external classification + calledBy)
   * @private
   */
  buildCallGraph(atoms) {
    const atomByName = new Map(atoms.map(a => [a.name, a]));
    const definedFunctions = new Set(atoms.map(a => a.name));

    // First pass: classify calls
    atoms.forEach(atom => {
      atom.calls.forEach(call => {
        call.type = definedFunctions.has(call.name) ? 'internal' : 'external';
      });
    });

    // Second pass: build calledBy
    atoms.forEach(atom => { atom.calledBy = []; });

    atoms.forEach(callerAtom => {
      callerAtom.calls.forEach(call => {
        if (call.type === 'internal') {
          const targetAtom = atomByName.get(call.name);
          if (targetAtom && targetAtom.id !== callerAtom.id) {
            if (!targetAtom.calledBy.includes(callerAtom.id)) {
              targetAtom.calledBy.push(callerAtom.id);
            }
          }
        }
      });
    });
  }

  /**
   * Recalculate archetypes with calledBy info
   * @private
   */
  recalculateArchetypes(atoms) {
    atoms.forEach(atom => {
      atom.archetype = this.detectAtomArchetype(atom);
    });
  }
}

export default AtomExtractionPhase;
