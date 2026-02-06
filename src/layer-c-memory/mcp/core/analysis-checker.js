/**
 * @fileoverview analysis-checker.js
 * 
 * Verifica y ejecuta Layer A si es necesario.
 * Flujo: Verifica .OmnySysData/ → Ejecuta Layer A si falta → Espera completado
 * 
 * @module mcp/core/analysis-checker
 */

import path from 'path';
import fs from 'fs/promises';

/**
 * Verifica si existe análisis previo en .OmnySysData/
 */
async function hasExistingAnalysis(projectPath) {
  try {
    const indexPath = path.join(projectPath, '.OmnySysData', 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cuenta archivos pendientes de análisis LLM
 */
async function countPendingLLMAnalysis(projectPath) {
  try {
    const { getProjectMetadata } = await import('../../../layer-a-static/storage/query-service.js');
    const { getFileAnalysis } = await import('../../../layer-a-static/storage/query-service.js');
    
    const metadata = await getProjectMetadata(projectPath);
    
    let pendingCount = 0;
    const fileEntries = metadata?.fileIndex || metadata?.files || {};
    
    for (const filePath of Object.keys(fileEntries)) {
      const analysis = await getFileAnalysis(projectPath, filePath);
      
      // Un archivo necesita LLM si:
      // 1. No tiene llmInsights Y
      // 2. Tiene características que sugieren que necesita LLM
      if (!analysis?.llmInsights) {
        const needsLLM = 
          analysis?.semanticAnalysis?.sharedState?.writes?.length > 0 ||
          analysis?.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0 ||
          (analysis?.exports?.length > 0 && analysis?.dependents?.length === 0);
        
        if (needsLLM) pendingCount++;
      }
    }
    
    return pendingCount;
  } catch {
    return 0;
  }
}

/**
 * Ejecuta Layer A completo (BLOQUEANTE)
 */
async function runFullIndexing(projectPath) {
  const { indexProject } = await import('../../../layer-a-static/indexer.js');
  
  console.error('   🚀 Starting Layer A: Static Analysis...');
  console.error('   ⏳ This may take 30-60 seconds...');
  
  try {
    const result = await indexProject(projectPath, {
      verbose: true,
      skipLLM: false, // Permitir IA si detecta casos complejos
      outputPath: 'system-map.json'
    });
    
    console.error(`\n   📊 Layer A: ${Object.keys(result.files || {}).length} files analyzed`);
    
    // Verificar si IA se activó
    const hasLLM = Object.values(result.files || {}).some(
      f => f.aiEnhancement || f.llmInsights
    );
    
    if (hasLLM) {
      console.error('   🤖 Layer B: IA enrichment applied');
    } else {
      console.error('   ℹ️  Layer B: Static analysis sufficient (no IA needed)');
    }
    
    return result;
  } catch (error) {
    console.error('   ❌ Indexing failed:', error.message);
    throw error;
  }
}

/**
 * Verifica y ejecuta análisis si es necesario
 * Flujo principal llamado durante inicialización
 */
export async function checkAndRunAnalysis(projectPath) {
  try {
    const { getProjectMetadata } = await import('../../../layer-a-static/storage/query-service.js');
    
    const hasAnalysis = await hasExistingAnalysis(projectPath);
    
    if (!hasAnalysis) {
      console.error('⚠️  No analysis found, running Layer A...');
      console.error('   ⏳ This may take 30-60 seconds...\n');
      
      await runFullIndexing(projectPath);
      
      console.error('\n✅ Layer A completed');
      console.error('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: 0 };
    }
    
    // Tiene análisis, verificar si es válido
    const metadata = await getProjectMetadata(projectPath);
    const fileCount = metadata?.metadata?.totalFiles || 0;
    
    console.error(`✅ Found existing analysis: ${fileCount} files`);
    
    // Validar si el análisis base de Layer A está completo
    const hasValidBaseAnalysis = 
      fileCount > 0 && 
      (metadata?.fileIndex || metadata?.files) && 
      metadata?.metadata?.enhanced === true;
    
    if (!hasValidBaseAnalysis) {
      console.error('   🚨 Analysis incomplete, running Layer A...');
      console.error('   ⏳ This may take 30-60 seconds...\n');
      
      await runFullIndexing(projectPath);
      
      console.error('\n✅ Layer A completed');
      console.error('   🤖 LLM enrichment will continue in background');
      return { ran: true, filesAnalyzed: fileCount };
    }
    
    console.error('   ✅ Layer A analysis valid');
    
    // Verificar si hay archivos pendientes de LLM
    const pendingLLM = await countPendingLLMAnalysis(projectPath);
    if (pendingLLM > 0) {
      console.error(`   ⏳ ${pendingLLM} files pending LLM enrichment (background)`);
    } else {
      console.error('   ✅ All files processed');
    }
    
    return { ran: false, filesAnalyzed: fileCount };
  } catch (error) {
    console.error('   ❌ Analysis check failed:', error.message);
    throw error;
  }
}
