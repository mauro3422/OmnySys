import fs from 'fs/promises';
import path from 'path';

/**
 * Analiza archivos complejos con LLM basado en metadatos de Layer A
 *
 * Esta funcion revisa los metadatos que Layer A genero y decide que archivos
 * necesitan analisis LLM para fortalecer las conexiones semanticas.
 *
 * REGLA: Solo se envia a LLM si los arquetipos detectados requieren analisis
 * semantico. Si la metadata sola puede determinar el patron (ej: dependencias
 * circulares, modulos huerfanos), NO debe pasar por LLM. El LLM es para
 * conexiones INVISIBLES que la metadata no puede resolver:
 * - Eventos (que archivos emiten/escuchan el mismo evento)
 * - Estado compartido (que archivos leen/escriben la misma key de localStorage)
 * - Imports dinamicos (que rutas resuelven los import() en runtime)
 * - God objects (que responsabilidades tiene y como afecta dependents)
 */
export async function _analyzeComplexFilesWithLLM() {
  console.log('\nðŸ¤– Orchestrator: Analyzing complex files with LLM...');

  try {
    // Importar dependencias dinámicamente
    const { LLMAnalyzer } = await import('../../layer-b-semantic/llm-analyzer/index.js');
    const { getFileAnalysis } = await import('../../layer-a-static/storage/query-service.js');
    const { detectArchetypes } = await import('../../layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js');
    const { buildPromptMetadata } = await import('../../layer-b-semantic/metadata-contract.js');

    // Inicializar LLM Analyzer
    const aiConfig = await (await import('../../ai/llm-client.js')).loadAIConfig();
    const llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
    const initialized = await llmAnalyzer.initialize();

    if (!initialized) {
      console.log('   âš ï¸  LLM not available, skipping LLM analysis');
      return;
    }

    // Leer índice de archivos analizados por Layer A
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);

    const filesNeedingLLM = [];

    // Revisar cada archivo en el índice
    for (const [filePath, fileInfo] of Object.entries(index.fileIndex || {})) {
      // Obtener análisis completo del archivo
      const fileAnalysis = await getFileAnalysis(this.projectPath, filePath);
      if (!fileAnalysis) continue;

      // Verificar si ya fue procesado por LLM
      if (fileAnalysis.llmInsights) {
        continue; // Ya tiene análisis LLM, saltear
      }
      // Detectar arquetipos basado en metadatos estandarizados
      const metadata = buildPromptMetadata(filePath, fileAnalysis);

      const archetypes = detectArchetypes(metadata);

      // DEBUG: Log de arquetipos detectados
      if (archetypes.length > 0) {
        console.log(`   ðŸ” ${filePath}: Arquetipos detectados: ${archetypes.map(a => a.type).join(', ')}`);
      }

      // Decidir si necesita LLM basado en arquetipos y análisis estático
      const needsLLM = archetypes.length > 0 || llmAnalyzer.needsLLMAnalysis(
        fileAnalysis.semanticAnalysis || {},
        fileAnalysis
      );

      if (needsLLM) {
        console.log(`   âœ… ${filePath}: Necesita LLM (${archetypes.map(a => a.type).join(', ')})`);
        filesNeedingLLM.push({
          filePath,
          fileAnalysis,
          archetypes: archetypes.map(a => a.type),
          priority: this._calculateLLMPriority(archetypes, metadata)
        });
      }
    }

    if (filesNeedingLLM.length === 0) {
      console.log('   â„¹ï¸  No files need LLM analysis (static analysis sufficient)');
      console.log('   âœ… Emitting analysis:complete event');
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

    console.log(`   ðŸ“Š Found ${filesNeedingLLM.length} files needing LLM analysis`);

    // Agregar archivos a la cola con prioridad
    for (const file of filesNeedingLLM) {
      this.queue.enqueueJob({
        filePath: file.filePath,
        needsLLM: true,
        archetypes: file.archetypes,
        fileAnalysis: file.fileAnalysis
      }, file.priority);

      console.log(`   âž• Added to queue: ${file.filePath} (${file.priority}) - ${file.archetypes.join(', ')}`);
    }

    console.log(`   âœ… ${filesNeedingLLM.length} files added to analysis queue`);
    console.log('   ðŸš€ Starting processing...');

    // Iniciar procesamiento
    this._processNext();
  } catch (error) {
    console.error('   âŒ Error in LLM analysis phase:', error.message);
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
