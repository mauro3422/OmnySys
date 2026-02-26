/**
 * @fileoverview analyzer.js - Core integrity rules
 */

export function analyzeFileIntegrityData(filePath, fileData) {
  const issues = [];
  const warnings = [];
  const data = fileData.data;
  
  // 1. Verificar campos mínimos esperados
  const requiredFields = ['path', 'exports', 'imports', 'definitions'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      issues.push(`missing-field:${field}`);
    }
  }
  
  // 2. Verificar si tiene definiciones pero no exports
  const definitions = data.definitions || [];
  const exports = data.exports || [];
  if (definitions.length > 0 && exports.length === 0) {
    warnings.push('has-definitions-no-exports');
  }
  
  // 3. Verificar estructura de definiciones
  const invalidDefCount = definitions.filter(def => !def.type || !def.name).length;
  if (invalidDefCount > 0) {
    issues.push(`invalid-definitions:${invalidDefCount}`);
  }
  
  // 4. Verificar semanticAnalysis
  const semanticAnalysis = data.semanticAnalysis || {};
  const hasSemanticData = 
    (semanticAnalysis.events?.all?.length > 0) ||
    (semanticAnalysis.localStorage?.all?.length > 0) ||
    (semanticAnalysis.globals?.all?.length > 0) ||
    (semanticAnalysis.envVars?.length > 0);
  
  // 5. Calcular completitud
  const completeness = calculateCompletenessScore(data, hasSemanticData);
  
  return {
    filePath,
    completeness,
    definitions: definitions.length,
    exports: exports.length,
    imports: (data.imports || []).length,
    usedBy: (data.usedBy || []).length,
    dependsOn: (data.dependsOn || []).length,
    semanticConnections: (data.semanticConnections || []).length,
    hasSemanticData,
    hasRiskScore: !!data.riskScore,
    issues,
    warnings,
    size: fileData.size
  };
}

function calculateCompletenessScore(data, hasSemanticData) {
  let score = 0;
  if (data.exports?.length > 0) score += 20;
  if (data.imports?.length > 0) score += 20;
  if (data.definitions?.length > 0) score += 20;
  if (data.usedBy?.length > 0) score += 15;
  if (data.dependsOn?.length > 0) score += 10;
  if (hasSemanticData) score += 10;
  if (data.riskScore) score += 5;
  return score;
}

export function classifyEntriesByContext(noDefinitions) {
  return {
    test: noDefinitions.filter(r => r.filePath.includes('.test.') || r.filePath.includes('.spec.') || r.filePath.includes('/tests/')),
    config: noDefinitions.filter(r => r.filePath.includes('config') || r.filePath.includes('.config.')),
    types: noDefinitions.filter(r => r.filePath.endsWith('.d.ts') || r.filePath.includes('/types/')),
    scripts: noDefinitions.filter(r => r.filePath.startsWith('scripts/')),
    archive: noDefinitions.filter(r => r.filePath.startsWith('archive/')),
    root: noDefinitions.filter(r => !r.filePath.includes('/')),
    other: noDefinitions.filter(r => 
      !r.filePath.includes('.test.') && 
      !r.filePath.includes('.spec.') && 
      !r.filePath.includes('/tests/') &&
      !r.filePath.includes('config') &&
      !r.filePath.includes('.config.') &&
      !r.filePath.endsWith('.d.ts') &&
      !r.filePath.includes('/types/') &&
      !r.filePath.startsWith('scripts/') &&
      !r.filePath.startsWith('archive/') &&
      r.filePath.includes('/')
    )
  };
}
