/**
 * Tool: analyze_change
 * Analyzes the impact of changing a specific symbol
 */

import { getFileAnalysis } from '#layer-a/query/index.js';
import { get_impact_map } from './impact-map.js';

export async function analyze_change(args, context) {
  const { filePath, symbolName } = args;
  const { orchestrator, projectPath, server } = context;
  
  console.error(`[Tool] analyze_change("${filePath}", "${symbolName}")`);

  // Ensure file is analyzed
  let fileData = await getFileAnalysis(projectPath, filePath);
  
  if (!fileData && server?.initialized && orchestrator) {
    console.error(`  → Auto-analyzing file`);
    try {
      await orchestrator.analyzeAndWait(filePath, 60000);
      fileData = await getFileAnalysis(projectPath, filePath);
    } catch (error) {
      console.error(`  → Analysis failed: ${error.message}`);
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

  return {
    symbol: symbolName,
    file: filePath,
    symbolType: symbol.kind,
    directDependents: impactMap.directlyAffects || [],
    transitiveDependents: impactMap.transitiveAffects || [],
    totalAffected: (impactMap.directlyAffects?.length || 0) + (impactMap.transitiveAffects?.length || 0),
    riskLevel: fileData.riskScore?.severity || 'low',
    recommendation:
      fileData.riskScore?.severity === 'critical'
        ? '⚠️ HIGH RISK - This change affects many files'
        : (impactMap.directlyAffects?.length || 0) > 10
        ? '⚠️ MEDIUM RISK - Many direct dependents'
        : '✓ Safe - Limited scope'
  };
}
