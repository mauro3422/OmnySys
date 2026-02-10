/**
 * @fileoverview atom-extraction-phase.js
 *
 * Phase 1: Extract atoms (functions) from source code
 * Creates atomic metadata for each function in the file
 *
 * @module pipeline/phases/atom-extraction-phase
 */

import { ExtractionPhase } from './base-phase.js';
import { extractFunctionCode, getLineNumber } from '../../../shared/utils/ast-utils.js';
import { extractSideEffects } from '../../extractors/metadata/side-effects.js';
import { extractCallGraph } from '../../extractors/metadata/call-graph.js';
import { extractDataFlow as extractDataFlowV2 } from '../../extractors/data-flow/index.js';
import { extractTypeInference } from '../../extractors/metadata/type-inference.js';
import { extractTemporalPatterns } from '../../extractors/metadata/temporal-patterns.js';
import { extractTemporalPatterns as extractTemporalConnections } from '../../extractors/metadata/temporal-connections.js';
import { extractPerformanceHints } from '../../extractors/metadata/performance-hints.js';
import { extractPerformanceMetrics } from '../../extractors/metadata/performance-impact.js';
import { extractTypeContracts } from '../../extractors/metadata/type-contracts.js';
import { extractErrorFlow } from '../../extractors/metadata/error-flow.js';
import { extractDNA } from '../../extractors/metadata/dna-extractor.js';
import { validateForLineage } from '../../../layer-b-semantic/validators/lineage-validator.js';
import { logger } from '../../../utils/logger.js';

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
        const functionCode = extractFunctionCode(code, functionInfo);
        return this.extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath);
      })
    );
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
    const performanceHints = extractPerformanceHints(functionCode);
    
    // NUEVOS: 4 sistemas de conexiones enriquecidas
    const performanceMetrics = extractPerformanceMetrics(functionCode, performanceHints);
    const typeContracts = extractTypeContracts(functionCode, fileMetadata.jsdoc, functionInfo);
    const errorFlow = extractErrorFlow(functionCode, typeContracts);
    const temporalPatterns = extractTemporalConnections(functionCode, functionInfo);

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
      filePath: filePath,
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
      
      // Temporal Connections (NUEVO)
      temporal: {
        patterns: temporalPatterns,
        executionOrder: null // Se llena en cross-reference
      },
      
      // Type Contracts (NUEVO)
      typeContracts: typeContracts,
      
      // Error Flow (NUEVO)
      errorFlow: errorFlow,

      // Performance (Legacy hints + NUEVO impact metrics)
      hasNestedLoops: performanceHints.nestedLoops.length > 0,
      hasBlockingOps: performanceHints.blockingOperations.length > 0,
      performance: performanceMetrics, // NUEVO: métricas completas

      // Data Flow Fractal (Fase 1)
      dataFlow: dataFlowV2?.real || dataFlowV2 || null,
      dataFlowAnalysis: dataFlowV2?.analysis || null,
      hasDataFlow: dataFlowV2 !== null && (dataFlowV2.inputs?.length > 0 || dataFlowV2.real?.inputs?.length > 0),

      // DNA & Lineage (Shadow Registry integration)
      dna: null, // Will be populated below
      lineage: null,

      // Metadata
      _meta: {
        dataFlowVersion: '1.0.0-fractal',
        extractionTime: new Date().toISOString(),
        confidence: dataFlowV2?.analysis?.coherence ? dataFlowV2.analysis.coherence / 100 : 0.5
      }
    };

    // Extract DNA for lineage tracking
    try {
      atomMetadata.dna = extractDNA(atomMetadata);
    } catch (error) {
      logger.warn(`DNA extraction failed for ${functionInfo.name}: ${error.message}`);
    }

    // Validate for lineage (if DNA was extracted)
    if (atomMetadata.dna) {
      const validation = validateForLineage(atomMetadata);
      atomMetadata._meta.lineageValidation = {
        valid: validation.valid,
        confidence: validation.confidence,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

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
