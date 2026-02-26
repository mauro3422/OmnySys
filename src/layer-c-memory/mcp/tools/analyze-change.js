/**
 * Tool: analyze_change
 * Analyzes the impact of changing a specific symbol
 *
 * Integrated with graph algebra:
 * - centrality estimation
 * - breaking-change prediction
 */

import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
import { get_impact_map } from './impact-map.js';
import { getAllAtoms } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';
import { AnalysisEngine } from '../core/shared/analysis-engine.js';

const logger = createLogger('OmnySys:analyze:change');

export async function analyze_change(args, context) {
  const {
    filePath,
    symbolName,
    autoAnalyzeMissing = false,
    autoAnalyzeTimeoutMs = 60000
  } = args || {};

  const { orchestrator, projectPath, server } = context;

  logger.info(`[Tool] analyze_change("${filePath}", "${symbolName}")`);

  let fileData = await getFileAnalysis(projectPath, filePath);

  if (!fileData && autoAnalyzeMissing && server?.initialized && orchestrator) {
    logger.info('  -> Auto-analyzing missing file (autoAnalyzeMissing=true)');
    try {
      await orchestrator.analyzeAndWait(filePath, autoAnalyzeTimeoutMs);
      fileData = await getFileAnalysis(projectPath, filePath);
    } catch (error) {
      logger.warn(`  -> Analysis failed: ${error.message}`);
    }
  }

  if (!fileData) {
    return {
      error: `Could not analyze ${filePath}`,
      suggestion: autoAnalyzeMissing
        ? 'File may not exist or analysis failed'
        : 'Read-only mode by default. Re-run with autoAnalyzeMissing=true if needed.'
    };
  }

  const symbol = fileData.exports?.find((e) => e.name === symbolName);
  if (!symbol) {
    return {
      error: `Symbol '${symbolName}' not found in ${filePath}`,
      availableExports: fileData.exports?.map((e) => e.name) || []
    };
  }

  const impactMap = await get_impact_map(
    { filePath, autoAnalyzeMissing, autoAnalyzeTimeoutMs },
    context
  );

  // --- UNIFICACIÓN CON ANALYSIS ENGINE ---
  const allAtoms = await getAllAtoms(projectPath);
  const blastRadius = await AnalysisEngine.analyzeBlastRadius(
    symbolName,
    filePath,
    projectPath,
    allAtoms
  );

  return {
    symbol: symbolName,
    file: filePath,
    symbolType: symbol.kind,
    directDependents: impactMap.directlyAffects || [],
    transitiveDependents: impactMap.transitiveAffects || [],
    totalAffected: blastRadius.directDependents + (impactMap.transitiveAffects?.length || 0),
    network: {
      centrality: blastRadius.score,
      classification: blastRadius.classification
    },
    riskLevel: blastRadius.level,
    recommendation: blastRadius.recommendation
  };
}

