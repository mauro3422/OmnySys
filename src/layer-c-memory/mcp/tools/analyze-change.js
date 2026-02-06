/**
 * Tool: analyze_change
 * Analyzes the impact of changing a specific symbol
 */

import { getFileAnalysis } from '../../../layer-a-static/query/index.js';
import { get_impact_map } from './impact-map.js';

export async function analyze_change(args, context) {
  const { filePath, symbolName } = args;
  const { orchestrator, projectPath } = context;
  
  console.error(`[Tool] analyze_change("${filePath}", "${symbolName}")`);

  // Ensure file is analyzed
  let fileData = await getFileAnalysis(projectPath, filePath);
  
  if (!fileData) {
    console.error(`  → Auto-analyzing file`);
    await orchestrator.analyzeAndWait(filePath, 60000);
    fileData = await getFileAnalysis(projectPath, filePath);
  }

  if (!fileData) {
    return { error: `Could not analyze ${filePath}` };
  }

  const symbol = fileData.exports?.find((e) => e.name === symbolName);

  if (!symbol) {
    return { error: `Symbol '${symbolName}' not found in ${filePath}` };
  }

  const impactMap = await get_impact_map({ filePath }, context);

  return {
    symbol: symbolName,
    file: filePath,
    symbolType: symbol.kind,
    directDependents: impactMap.directlyAffects || [],
    transitiveDependents: impactMap.transitiveAffects || [],
    riskLevel: fileData.riskScore?.severity,
    recommendation:
      fileData.riskScore?.severity === 'critical'
        ? '⚠️ HIGH RISK - This change affects many files'
        : '✓ Safe - Limited scope'
  };
}
