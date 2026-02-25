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
import { getAtomsInFile, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:analyze:change');

async function calculateSymbolCentrality(atomId, projectPath) {
  try {
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];

    const atoms = await getAtomsInFile(projectPath, filePath);
    const atom = atoms.find((a) => a.name === functionName);
    if (!atom) return null;

    const enriched = await enrichAtomsWithRelations(
      [atom],
      {
        scope: 'ids',
        ids: [atom.id],
        withCallers: true,
        withCallees: true
      },
      projectPath
    );

    const atomRel = enriched[0] || {};
    const inDegree = atomRel.callers?.length || 0;
    const outDegree = atomRel.callees?.length || 0;
    const centrality = inDegree / (outDegree + 1);

    return {
      centrality: centrality.toFixed(3),
      classification: centrality > 10 ? 'HUB' : centrality > 2 ? 'BRIDGE' : 'LEAF',
      inDegree,
      outDegree
    };
  } catch {
    return null;
  }
}

async function predictSymbolBreakingChanges(atomId, projectPath) {
  try {
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];

    const atoms = await getAtomsInFile(projectPath, filePath);
    const atom = atoms.find((a) => a.name === functionName);
    if (!atom) return null;

    const enriched = await enrichAtomsWithRelations(
      [atom],
      {
        scope: 'ids',
        ids: [atom.id],
        withCallers: true
      },
      projectPath
    );

    const atomRel = enriched[0] || {};
    const dependents = atomRel.callers || [];

    const risk = dependents.length > 10 ? 'HIGH' : dependents.length > 5 ? 'MEDIUM' : 'LOW';

    return {
      dependentCount: dependents.length,
      riskLevel: risk,
      recommendation:
        risk === 'HIGH'
          ? 'CRITICAL: Many dependents will break'
          : risk === 'MEDIUM'
            ? 'WARNING: Some dependents may break'
            : 'SAFE: Few dependents, low impact'
    };
  } catch {
    return null;
  }
}

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

  const atomId = `${filePath}::${symbolName}`;
  const centrality = await calculateSymbolCentrality(atomId, projectPath);
  const breakingChanges = await predictSymbolBreakingChanges(atomId, projectPath);

  let combinedRisk = 'low';
  const riskFactors = [];

  if (centrality) {
    riskFactors.push(`centrality: ${centrality.classification}`);
    if (centrality.classification === 'HUB') combinedRisk = 'critical';
    else if (centrality.classification === 'BRIDGE') combinedRisk = 'high';
  }

  if (breakingChanges) {
    riskFactors.push(`dependents: ${breakingChanges.dependentCount}`);
    if (breakingChanges.riskLevel === 'HIGH') combinedRisk = 'critical';
    else if (breakingChanges.riskLevel === 'MEDIUM' && combinedRisk !== 'critical') combinedRisk = 'high';
  }

  if ((impactMap.directlyAffects?.length || 0) > 10) {
    combinedRisk = combinedRisk === 'low' ? 'medium' : combinedRisk;
  }

  return {
    symbol: symbolName,
    file: filePath,
    symbolType: symbol.kind,
    directDependents: impactMap.directlyAffects || [],
    transitiveDependents: impactMap.transitiveAffects || [],
    totalAffected: (impactMap.directlyAffects?.length || 0) + (impactMap.transitiveAffects?.length || 0),
    network: {
      centrality,
      breakingChanges
    },
    riskLevel: combinedRisk,
    riskFactors,
    recommendation:
      combinedRisk === 'critical'
        ? 'CRITICAL: This is a HUB in the graph. Changes can break many dependents.'
        : combinedRisk === 'high'
          ? 'HIGH RISK: Many dependents will be affected.'
          : (impactMap.directlyAffects?.length || 0) > 10
            ? 'MEDIUM RISK: Many direct dependents.'
            : 'SAFE: Limited scope.'
  };
}
