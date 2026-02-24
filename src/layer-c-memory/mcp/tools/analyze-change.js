/**
 * Tool: analyze_change
 * Analyzes the impact of changing a specific symbol
 * 
 * INTEGRADO CON ÁLGEBRA DE GRAFOS:
 * - calculate_atom_centrality: PageRank-like importance
 * - predict_breaking_changes: qué se rompe si cambias
 */

import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
import { get_impact_map } from './impact-map.js';
import { getAtomsInFile, queryAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:analyze:change');

/**
 * Calcula centrality del símbolo usando relaciones
 */
async function calculateSymbolCentrality(atomId, projectPath) {
  try {
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];
    
    const atoms = await getAtomsInFile(projectPath, filePath);
    const atom = atoms.find(a => a.name === functionName);
    
    if (!atom) return null;
    
    const enriched = await enrichAtomsWithRelations([atom], {
      scope: 'ids',
      ids: [atom.id],
      withCallers: true,
      withCallees: true
    }, projectPath);
    
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
  } catch (e) {
    return null;
  }
}

/**
 * Predice breaking changes del símbolo
 */
async function predictSymbolBreakingChanges(atomId, projectPath) {
  try {
    const parts = atomId.split('::');
    const filePath = parts[0];
    const functionName = parts[1];
    
    const atoms = await getAtomsInFile(projectPath, filePath);
    const atom = atoms.find(a => a.name === functionName);
    
    if (!atom) return null;
    
    const enriched = await enrichAtomsWithRelations([atom], {
      scope: 'ids',
      ids: [atom.id],
      withCallers: true
    }, projectPath);
    
    const atomRel = enriched[0] || {};
    const dependents = atomRel.callers || [];
    
    const risk = dependents.length > 10 ? 'HIGH' : dependents.length > 5 ? 'MEDIUM' : 'LOW';
    
    return {
      dependentCount: dependents.length,
      riskLevel: risk,
      recommendation: risk === 'HIGH' 
        ? 'CRITICAL: Many dependents will break'
        : risk === 'MEDIUM'
          ? 'WARNING: Some dependents may break'
          : 'SAFE: Few dependents, low impact'
    };
  } catch (e) {
    return null;
  }
}

export async function analyze_change(args, context) {
  const { filePath, symbolName } = args;
  const { orchestrator, projectPath, server } = context;
  
  logger.error(`[Tool] analyze_change("${filePath}", "${symbolName}")`);

  // Ensure file is analyzed
  let fileData = await getFileAnalysis(projectPath, filePath);
  
  if (!fileData && server?.initialized && orchestrator) {
    logger.error(`  → Auto-analyzing file`);
    try {
      await orchestrator.analyzeAndWait(filePath, 60000);
      fileData = await getFileAnalysis(projectPath, filePath);
    } catch (error) {
      logger.error(`  → Analysis failed: ${error.message}`);
    }
  }

  if (!fileData) {
    return { 
      error: `Could not analyze ${filePath}`,
      suggestion: server?.initialized 
        ? 'File may not exist or server failed to analyze it' 
        : 'Server is still initializing, please retry in a moment'
    };
  }

  const symbol = fileData.exports?.find((e) => e.name === symbolName);

  if (!symbol) {
    return { 
      error: `Symbol '${symbolName}' not found in ${filePath}`,
      availableExports: fileData.exports?.map(e => e.name) || []
    };
  }

  const impactMap = await get_impact_map({ filePath }, context);
  const atomId = `${filePath}::${symbolName}`;
  
  // ÁLGEBRA DE GRAFOS: Calculate centrality
  const centrality = await calculateSymbolCentrality(atomId, projectPath);
  
  // ÁLGEBRA DE GRAFOS: Predict breaking changes
  const breakingChanges = await predictSymbolBreakingChanges(atomId, projectPath);

  // Combine risk levels
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
    // Basic impact
    directDependents: impactMap.directlyAffects || [],
    transitiveDependents: impactMap.transitiveAffects || [],
    totalAffected: (impactMap.directlyAffects?.length || 0) + (impactMap.transitiveAffects?.length || 0),
    // ÁLGEBRA DE GRAFOS - Network analysis
    network: {
      centrality,
      breakingChanges
    },
    riskLevel: combinedRisk,
    riskFactors,
    recommendation:
      combinedRisk === 'critical'
        ? '⚠️ CRITICAL: This is a HUB in the graph - changes will break many dependents'
        : combinedRisk === 'high'
        ? '⚠️ HIGH RISK: Many dependents will be affected'
        : (impactMap.directlyAffects?.length || 0) > 10
        ? '⚠️ MEDIUM RISK: Many direct dependents'
        : '✓ Safe - Limited scope'
  };
}
