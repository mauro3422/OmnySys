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
 *
 * ARQUETIPOS SIN LLM (requiresLLM: false):
 * - facade: 100% determinístico por reExportCount (AST)
 * - config-hub: 100% determinístico por exportCount + dependentCount (grafo)
 * - entry-point: 100% determinístico por importCount + dependentCount (grafo)
 * Estos se detectan y registran como arquetipo pero NO pasan por LLM.
 */
export async function _analyzeComplexFilesWithLLM() {
  console.log('\n\uD83E\uDD16 Orchestrator: Analyzing complex files with LLM...');

  try {
    // Importar dependencias dinámicamente
    const { LLMAnalyzer } = await import('../../layer-b-semantic/llm-analyzer/index.js');
    const { getFileAnalysis } = await import('../../layer-a-static/storage/query-service.js');
    const { detectArchetypes, filterArchetypesRequiringLLM } = await import('../../layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js');
    const { buildPromptMetadata } = await import('../../layer-b-semantic/metadata-contract.js');

    // Inicializar LLM Analyzer
    const aiConfig = await (await import('../../ai/llm-client.js')).loadAIConfig();
    const llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
    const initialized = await llmAnalyzer.initialize();

    if (!initialized) {
      console.log('   \u26A0\uFE0F  LLM not available, skipping LLM analysis');
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

      const allArchetypes = detectArchetypes(metadata);

      // Separar: arquetipos que necesitan LLM vs los que no
      const llmArchetypes = filterArchetypesRequiringLLM(allArchetypes);
      const metadataOnlyArchetypes = allArchetypes.filter(
        a => !llmArchetypes.some(l => l.type === a.type)
      );

      // DEBUG: Log de arquetipos detectados
      if (allArchetypes.length > 0) {
        const llmTypes = llmArchetypes.map(a => a.type).join(', ') || 'ninguno';
        const skipTypes = metadataOnlyArchetypes.map(a => a.type).join(', ') || 'ninguno';
        console.log(`   \uD83D\uDD0D ${filePath}: LLM=[${llmTypes}] Metadata-only=[${skipTypes}]`);
      }

      // Decidir si necesita LLM: solo si hay arquetipos que lo requieren
      // O si el analysis-decider detecta conexiones no resueltas
      const needsLLM = llmArchetypes.length > 0 || llmAnalyzer.needsLLMAnalysis(
        fileAnalysis.semanticAnalysis || {},
        fileAnalysis
      );

      if (needsLLM) {
        console.log(`   \u2705 ${filePath}: Necesita LLM (${llmArchetypes.map(a => a.type).join(', ')})`);
        filesNeedingLLM.push({
          filePath,
          fileAnalysis,
          archetypes: llmArchetypes.map(a => a.type),
          priority: this._calculateLLMPriority(llmArchetypes, metadata)
        });
      }
    }

    if (filesNeedingLLM.length === 0) {
      console.log('   \u2139\uFE0F  No files need LLM analysis (static analysis sufficient)');
      console.log('   \u2705 Emitting analysis:complete event');
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

    console.log(`   \uD83D\uDCCA Found ${filesNeedingLLM.length} files needing LLM analysis`);

    // Agregar archivos a la cola con prioridad
    for (const file of filesNeedingLLM) {
      this.queue.enqueueJob({
        filePath: file.filePath,
        needsLLM: true,
        archetypes: file.archetypes,
        fileAnalysis: file.fileAnalysis
      }, file.priority);

      console.log(`   \u2795 Added to queue: ${file.filePath} (${file.priority}) - ${file.archetypes.join(', ')}`);
    }

    console.log(`   \u2705 ${filesNeedingLLM.length} files added to analysis queue`);
    console.log('   \uD83D\uDE80 Starting processing...');

    // Iniciar procesamiento
    this._processNext();
  } catch (error) {
    console.error('   \u274C Error in LLM analysis phase:', error.message);
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
