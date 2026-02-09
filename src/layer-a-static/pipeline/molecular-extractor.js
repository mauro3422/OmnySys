/**
 * @fileoverview molecular-extractor.js
 *
 * Molecular Extractor - Composes molecules (files) from atoms (functions)
 *
 * CORE PRINCIPLE: Files are DERIVED from their functions, not analyzed directly
 *
 * ARCHITECTURE: Layer A (Static Extraction) → Layer B (Archetype Detection)
 * Each function becomes an ATOM with 57+ metadata fields
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Atomic Metadata Extractors
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new metadata extractor (e.g., security patterns, test coverage):
 *
 * 1️⃣  CREATE EXTRACTOR in: src/layer-a-static/extractors/metadata/
 *     Follow existing pattern: side-effects.js, call-graph.js, etc.
 *
 *     REQUIRED: Pure function that takes (functionCode, functionAst) and returns metadata
 *     EXAMPLE:
 *     export function extractSecurityPatterns(functionCode) {
 *       return {
 *         hasSQLInjection: /\.query\s*\(.*\+/.test(functionCode),
 *         hasXSSVulnerability: /innerHTML\s*=/.test(functionCode),
 *         confidence: 0.95
 *       };
 *     }
 *
 * 2️⃣  IMPORT EXTRACTOR here (line ~11-19)
 *     import { extractSecurityPatterns } from '../extractors/metadata/security-patterns.js';
 *
 * 3️⃣  ADD TO extractAtomMetadata() in the metadata composition section (line ~117-240)
 *     // NEW: Security analysis
 *     const securityPatterns = extractSecurityPatterns(functionCode);
 *
 * 4️⃣  ADD TO atomMetadata object (line ~175-240)
 *     // Security metadata
 *     hasSQLInjection: securityPatterns.hasSQLInjection,
 *     hasXSSVulnerability: securityPatterns.hasXSSVulnerability,
 *     securityScore: securityPatterns.confidence,
 *
 * 5️⃣  UPDATE ATOM ARCHETYPE in detectAtomArchetype() (line ~71-107)
 *     if (securityPatterns.hasSQLInjection || securityPatterns.hasXSSVulnerability) {
 *       return { type: 'security-risk', severity: 9, confidence: 0.9 };
 *     }
 *
 * 6️⃣  ADD DERIVATION RULE in: src/shared/derivation-engine.js
 *     See DerivationRules section there for molecular composition rules
 *
 * ⚠️  PRINCIPLES TO MAINTAIN:
 *     ✓ SSOT: Extractor is the ONLY place that knows how to detect that pattern
 *     ✓ SOLID: Each extractor has ONE responsibility
 *     ✓ Layer A: Extractors return RAW data, no interpretation
 *     ✓ Layer B: Archetype detection interprets the raw data
 *     ✓ Pure functions: No side effects, same input = same output
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module layer-a-static/pipeline/molecular-extractor
 * @phase 1-2 (Atom Extraction → Chain Building)
 * @dependencies extractors/metadata/*, derivation-engine.js
 */

import { AtomExtractionPhase, ChainBuildingPhase } from './phases/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Molecular Extraction Pipeline
 * Orchestrates extraction phases to convert code into molecular structure
 */
export class MolecularExtractionPipeline {
  constructor() {
    this.phases = [
      new AtomExtractionPhase(),
      new ChainBuildingPhase()
    ];
  }

  /**
   * Process a single file through the extraction pipeline
   * @param {string} filePath - Path to the file
   * @param {string} code - Source code
   * @param {Object} fileInfo - Parsed file info
   * @param {Object} fileMetadata - File-level metadata
   * @returns {Promise<Object>} - Molecular structure
   */
  async processFile(filePath, code, fileInfo, fileMetadata) {
    let context = { filePath, code, fileInfo, fileMetadata };

    logger.debug(`Starting molecular extraction for ${filePath}`);

    for (const phase of this.phases) {
      if (!phase.canExecute(context)) {
        logger.debug(`Skipping phase ${phase.name} - preconditions not met`);
        continue;
      }

      try {
        context = await phase.execute(context);
        logger.debug(`Phase ${phase.name} completed`);
      } catch (error) {
        logger.warn(`Phase ${phase.name} failed: ${error.message}`);
        
        // Try to handle error gracefully
        if (phase.handleError) {
          context = phase.handleError(error, context);
        } else {
          throw error;
        }
      }
    }

    return this.buildResult(context);
  }

  /**
   * Build final molecular structure from context
   * @private
   */
  buildResult(context) {
    return {
      filePath: context.filePath,
      type: 'molecule',
      atomCount: context.atoms?.length || 0,
      atoms: context.atoms || [],
      molecularChains: context.molecularChains || null,
      extractedAt: new Date().toISOString()
    };
  }
}

// Legacy convenience function (maintains backwards compatibility)
export async function extractMolecularStructure(filePath, code, fileInfo, fileMetadata) {
  const pipeline = new MolecularExtractionPipeline();
  return pipeline.processFile(filePath, code, fileInfo, fileMetadata);
}

// Phase 3: System-level analysis (operates on all molecules)
export async function analyzeProjectSystem(projectRoot, allMolecules) {
  logger.info('Phase 3: Analyzing project system...');

  try {
    const { analyzeModules, enrichMoleculesWithSystemContext } = await import('../module-system/index.js');
    
    const moduleData = analyzeModules(projectRoot, allMolecules);
    const enrichedMolecules = enrichMoleculesWithSystemContext(allMolecules, moduleData);

    logger.info(`Phase 3: Analyzed ${moduleData.summary.totalModules} modules, ${moduleData.summary.totalBusinessFlows} business flows`);

    return {
      molecules: enrichedMolecules,
      modules: moduleData.modules,
      system: moduleData.system,
      summary: moduleData.summary
    };
  } catch (error) {
    logger.error('Phase 3 failed:', error.message);
    return {
      molecules: allMolecules,
      modules: [],
      system: null,
      summary: { totalModules: 0, totalBusinessFlows: 0 }
    };
  }
}

// Phase 4: Race detection (operates on project data)
export async function detectRaceConditions(projectData) {
  logger.info('Phase 4: Detecting race conditions...');

  try {
    const { analyzeProjectRaces, enrichProjectWithRaces } = await import('../race-detector/integration.js');
    
    const raceResults = await analyzeProjectRaces(projectData);
    const enrichedProjectData = enrichProjectWithRaces(projectData, raceResults);

    logger.info(`Phase 4: Detected ${raceResults.summary.totalRaces} races`);

    const criticalRaces = raceResults.races.filter(r => r.severity === 'critical');
    if (criticalRaces.length > 0) {
      logger.warn(`${criticalRaces.length} CRITICAL races detected!`);
    }

    return enrichedProjectData;
  } catch (error) {
    logger.error('Phase 4 failed:', error.message);
    return projectData;
  }
}

export default MolecularExtractionPipeline;
