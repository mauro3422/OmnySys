/**
 * @fileoverview analyzer.js
 * Core analysis for audit-data-flow
 */
// Importar APIs REALES del sistema
const { getFileAnalysis, getFileAnalysisWithAtoms } = await import(
  '../../src/layer-c-memory/query/apis/file-api.js'
);
const { needsLLMAnalysis, computeMetadataCompleteness } = await import(
  '../../src/layer-b-semantic/llm-analyzer/analysis-decider.js'
);

export async function auditDataFlow(rootPath, filePath) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📋 AUDITANDO: ${filePath}`);
  console.log('═'.repeat(70));
  
  const results = {
    filePath,
    layers: {},
    issues: [],
    score: 0
  };
  
  try {
    const fileAnalysis = await getFileAnalysis(rootPath, filePath);
    if (!fileAnalysis) {
      console.log('   ❌ No se encontró análisis del archivo');
      results.issues.push('NO_FILE_ANALYSIS');
      return results;
    }
    
    results.layers.fileAnalysis = {
      exists: true,
      imports: fileAnalysis.imports?.length || 0,
      exports: fileAnalysis.exports?.length || 0,
      atoms: fileAnalysis.atomIds?.length || fileAnalysis.atoms?.length || 0,
      semanticConnections: fileAnalysis.semanticConnections?.length || 0,
      hasLLMInsights: !!fileAnalysis.llmInsights,
      contentHash: fileAnalysis.contentHash?.substring(0, 8) + '...',
      usedBy: (fileAnalysis.usedBy || []).length
    };
    
    console.log(`\n🔹 LAYER A: Análisis Estático`);
    console.log('─'.repeat(50));
    console.log(`   ✅ Imports:          ${results.layers.fileAnalysis.imports}`);
    console.log(`   ✅ Exports:          ${results.layers.fileAnalysis.exports}`);
    console.log(`   ✅ Átomos:           ${results.layers.fileAnalysis.atoms}`);
    console.log(`   ✅ UsedBy:           ${results.layers.fileAnalysis.usedBy}`);
    
    const atomsResult = await getFileAnalysisWithAtoms(rootPath, filePath);
    if (atomsResult?.atoms?.length > 0) {
      results.layers.atoms = {
        count: atomsResult.atoms.length,
        withCalledBy: atomsResult.atoms.filter(a => a.calledBy?.length > 0).length,
        withCalls: atomsResult.atoms.filter(a => a.calls?.length > 0).length
      };
      console.log(`\n🔹 LAYER A: Átomos Detallados`);
      console.log(`   ✅ Total átomos:     ${results.layers.atoms.count}`);
      console.log(`   ✅ Con calledBy:     ${results.layers.atoms.withCalledBy}`);
    }

    const { score: completenessScore, gaps } = computeMetadataCompleteness(fileAnalysis);
    results.layers.metadata = { score: completenessScore, gaps };
    console.log(`\n🔹 LAYER B: Metadata Completeness`);
    console.log(`   ✅ Score:            ${completenessScore.toFixed(2)} / 1.0`);

    const needsLLM = needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
    results.layers.llmDecision = { needsLLM };
    console.log(`\n🔹 LAYER B: Decisión LLM`);
    console.log(`   ${needsLLM ? '❓' : '✅'} Necesita LLM:      ${needsLLM ? 'Sí' : 'Bypass'}`);

    results.score = calculateFlowScore(results);
    console.log(`\n📊 SCORE DE CALIDAD: ${results.score}/100`);

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.issues.push('AUDIT_ERROR');
  }
  
  return results;
}

export function calculateFlowScore(results) {
  let score = 0;
  if (results.layers.fileAnalysis?.exists) score += 20;
  if (results.layers.atoms?.count > 0) score += 20;
  if (results.layers.atoms?.withCalledBy > 0) score += 15;
  if (results.layers.atoms?.withCalls > 0) score += 10;
  if (results.layers.metadata?.score >= 0.75) score += 15;
  else if (results.layers.metadata?.score >= 0.5) score += 7;
  if (results.layers.fileAnalysis?.semanticConnections > 0) score += 10;
  if (results.layers.fileAnalysis?.usedBy > 0) score += 10;
  return score;
}
