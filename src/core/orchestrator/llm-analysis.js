import fs from 'fs/promises';
import path from 'path';
import { safeReadJson } from '#utils/json-safe.js';

/**
 * Analiza archivos complejos con LLM basado en metadatos de Layer A
 *
 * Esta función revisa los metadatos que Layer A generó y decide qué archivos
 * necesitan análisis LLM para fortalecer las conexiones semánticas.
 *
 * Criterios para necesitar LLM:
 * - Archivos huérfanos (0 dependents) - potencialmente conectados por estado global
 * - Archivos con shared state detectado (window.*, localStorage)
 * - Archivos con eventos complejos
 * - Archivos con imports dinámicos
 * - God objects (muchos exports + dependents)
 */
export async function _analyzeComplexFilesWithLLM() {
  console.log('\n🤖 Orchestrator: Analyzing complex files with LLM...');

  try {
    // Importar dependencias dinámicamente
    const { LLMAnalyzer } = await import('../../layer-b-semantic/llm-analyzer/index.js');
    const { getFileAnalysis } = await import('../../layer-a-static/query/index.js');
    const { detectArchetypes } = await import('../../layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js');
    const { buildPromptMetadata } = await import('../../layer-b-semantic/metadata-contract.js');

    // Inicializar LLM Analyzer
    const aiConfig = await (await import('../../ai/llm-client.js')).loadAIConfig();
    const llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
    const initialized = await llmAnalyzer.initialize();

    if (!initialized) {
      console.log('   ⚠️  LLM not available, skipping LLM analysis');
      return;
    }

    // Leer índice de archivos analizados por Layer A
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    const index = await safeReadJson(indexPath, { fileIndex: {} });
    
    if (!index || !index.fileIndex) {
      console.log('   ⚠️  No valid index found, skipping LLM analysis');
      return;
    }

    const filesNeedingLLM = [];

    // Revisar cada archivo en el índice - PROCESAMIENTO PARALELO POR BATCHES
    const entries = Object.entries(index.fileIndex || {});
    const BATCH_SIZE = 10; // Procesar 10 archivos en paralelo

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      
      // Procesar batch en paralelo
      await Promise.all(batch.map(async ([filePath, fileInfo]) => {
        // Obtener análisis completo del archivo
        const fileAnalysis = await getFileAnalysis(this.projectPath, filePath);
        if (!fileAnalysis) return;

        // Verificar si ya fue procesado por LLM
        if (fileAnalysis.llmInsights) {
          return; // Ya tiene análisis LLM, saltear
        }

        // Detectar arquetipos basado en metadatos estandarizados
        const metadata = buildPromptMetadata(filePath, fileAnalysis);
        const archetypes = detectArchetypes(metadata);

        // DEBUG: Log de arquetipos detectados
        if (archetypes.length > 0) {
          console.log(`   🔍 ${filePath}: Arquetipos detectados: ${archetypes.map(a => a.type).join(', ')}`);
        }

        // Decidir si necesita LLM basado en arquetipos y análisis estático
        const needsLLM = archetypes.length > 0 || llmAnalyzer.needsLLMAnalysis(
          fileAnalysis.semanticAnalysis || {},
          fileAnalysis
        );

        if (needsLLM) {
          console.log(`   ✅ ${filePath}: Necesita LLM (${archetypes.map(a => a.type).join(', ')})`);
          filesNeedingLLM.push({
            filePath,
            fileAnalysis,
            archetypes: archetypes.map(a => a.type),
            priority: this._calculateLLMPriority(archetypes, metadata)
          });
        }
      }));

      // Yield al event loop cada batch para no bloquear
      await new Promise(resolve => setImmediate(resolve));
    }

    if (filesNeedingLLM.length === 0) {
      console.log('   ℹ️  No files need LLM analysis (static analysis sufficient)');
      console.log('   ✅ Emitting analysis:complete event');
      // Emitir evento de completado aunque no haya archivos para analizar
      this.emit('analysis:complete', {
        iterations: 0,
        totalFiles: this.indexedFiles.size,
        issues: { stats: { totalIssues: 0 } }
      });
      return;
    }

    // Guardar cuántos archivos deben analizarse
    this.totalFilesToAnalyze = filesNeedingLLM.length;
    this.processedFiles.clear();
    this.analysisCompleteEmitted = false;

    console.log(`   📊 Found ${filesNeedingLLM.length} files needing LLM analysis`);

    // Agregar archivos a la cola con prioridad
    for (const file of filesNeedingLLM) {
      this.queue.enqueueJob({
        filePath: file.filePath,
        needsLLM: true,
        archetypes: file.archetypes,
        fileAnalysis: file.fileAnalysis
      }, file.priority);

      console.log(`   ➕ Added to queue: ${file.filePath} (${file.priority}) - ${file.archetypes.join(', ')}`);
    }

    console.log(`   ✅ ${filesNeedingLLM.length} files added to analysis queue`);
    console.log('   🚀 Starting processing...');

    // Iniciar procesamiento
    this._processNext();
  } catch (error) {
    console.error('   ❌ Error in LLM analysis phase:', error.message);
  }
}

/**
 * Calcula prioridad para análisis LLM
 */
export function _calculateLLMPriority(archetypes, metadata) {
  // Prioridad CRITICAL: God objects, archivos críticos
  if (archetypes.some(a => a.type === 'god-object')) return 'critical';

  // Prioridad HIGH: Orphan modules, state managers (conexiones ocultas)
  if (archetypes.some(a => ['orphan-module', 'state-manager', 'event-hub'].includes(a.type))) {
    return 'high';
  }

  // Prioridad MEDIUM: Dynamic imports, singletons
  if (archetypes.some(a => ['dynamic-importer', 'singleton'].includes(a.type))) {
    return 'medium';
  }

  // Prioridad LOW: Otros casos
  return 'low';
}
