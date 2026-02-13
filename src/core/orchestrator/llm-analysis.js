import fs from 'fs/promises';
import path from 'path';
import { safeReadJson } from '#utils/json-safe.js';
import { createLogger } from '../../utils/logger.js';
import { getDecisionAuditLogger } from '../../layer-c-memory/shadow-registry/audit-logger.js';

const logger = createLogger('OmnySys:llm:analysis');

/**
 * Determina si un archivo necesita LLM basado en arquetipos y Gates de decisión
 * 
 * GATE 1: Verificar arquetipos con requiresLLM = true (siempre necesitan LLM)
 * GATE 2: Verificar arquetipos con requiresLLM = 'conditional' (usar analysis-decider)
 * GATE 3: Arquetipos con requiresLLM = false (nunca necesitan LLM)
 * GATE 4: Fallback a analysis-decider si no hay arquetipos determinísticos
 * 
 * @param {Array} archetypes - Arquetipos detectados
 * @param {Object} fileAnalysis - Análisis del archivo
 * @param {Object} llmAnalyzer - Instancia del analizador LLM
 * @returns {boolean} - true si necesita LLM
 */
function shouldUseLLM(archetypes, fileAnalysis, llmAnalyzer) {
  // Si no hay arquetipos, usar analysis-decider como fallback
  if (!archetypes || archetypes.length === 0) {
    return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
  }

  // GATE 1: Si hay arquetipos que SIEMPRE requieren LLM
  const alwaysNeedsLLM = archetypes.some(a => a.requiresLLM === true);
  if (alwaysNeedsLLM) {
    return true;
  }

  // GATE 2: Si hay arquetipos condicionales, verificar con analysis-decider
  const hasConditional = archetypes.some(a => a.requiresLLM === 'conditional');
  if (hasConditional) {
    return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
  }

  // GATE 3: Si todos los arquetipos tienen requiresLLM = false, NO necesita LLM
  const allBypass = archetypes.every(a => a.requiresLLM === false);
  if (allBypass) {
    return false;
  }

  // Fallback: usar analysis-decider para casos mixtos
  return llmAnalyzer.needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
}

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
  logger.info('\n🤖 Orchestrator: Analyzing complex files with LLM...');

  try {
    // Importar dependencias dinámicamente
    const { LLMAnalyzer } = await import('../../layer-b-semantic/llm-analyzer/index.js');
    const { getFileAnalysis } = await import('../../layer-a-static/query/apis/file-api.js');
    const { detectArchetypes } = await import('../../layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js');
    const { buildPromptMetadata } = await import('../../layer-b-semantic/metadata-contract.js');

    // Inicializar LLM Analyzer
    const aiConfig = await (await import('../../ai/llm-client.js')).loadAIConfig();
    const llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
    const initialized = await llmAnalyzer.initialize();

    if (!initialized) {
      logger.info('   ⚠️  LLM not available, skipping LLM analysis');
      return;
    }

    // Leer índice de archivos analizados por Layer A
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    const index = await safeReadJson(indexPath, { fileIndex: {} });

    if (!index || !index.fileIndex) {
      logger.info('   ⚠️  No valid index found, skipping LLM analysis');
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
          logger.info(`   🔍 ${filePath}: Arquetipos detectados: ${archetypes.map(a => a.type).join(', ')}`);
        }

        // Decidir si necesita LLM basado en arquetipos y Gates de decisión
        const needsLLM = shouldUseLLM(archetypes, fileAnalysis, llmAnalyzer);

        // 🆕 NUEVO: Loguear decisión arquitectónica (BUG #47 FIX #3)
        const auditLogger = getDecisionAuditLogger(this.projectPath);
        await auditLogger.initialize();

        if (needsLLM) {
          logger.info(`   ✅ ${filePath}: Necesita LLM (${archetypes.map(a => a.type).join(', ')})`);

          // Loguear decisión de enviar a LLM
          await auditLogger.logLLMRequired(
            filePath,
            `Arquetipos detectados: ${archetypes.map(a => a.type).join(', ')}`,
            aiConfig?.model || 'unknown',
            { archetypes, metadata: metadata.summary }
          );

          // Loguear arquetipos detectados
          for (const archetype of archetypes) {
            await auditLogger.logArchetypeDetection(
              filePath,
              archetype,
              archetype.detectedBy || 'rule',
              { confidence: archetype.confidence }
            );
          }

          filesNeedingLLM.push({
            filePath,
            fileAnalysis,
            archetypes: archetypes.map(a => a.type),
            priority: this._calculateLLMPriority(archetypes, metadata)
          });
        } else {
          // Loguear bypass de LLM
          await auditLogger.logLLMBypass(
            filePath,
            `Layer A analysis sufficient. Arquetipos: ${archetypes.map(a => a.type).join(', ')}`,
            archetypes.find(a => a.requiresLLM === false)?.ruleId || 'layer-a-sufficient',
            { archetypes, reason: 'Static analysis covers all connections' }
          );
        }
      }));

      // Yield al event loop cada batch para no bloquear
      await new Promise(resolve => setImmediate(resolve));
    }

    if (filesNeedingLLM.length === 0) {
      logger.info('   i  No files need LLM analysis (static analysis sufficient)');
      logger.info('   ✅ Emitting analysis:complete event');
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

    logger.info(`   📊 Found ${filesNeedingLLM.length} files needing LLM analysis`);

    // Agregar archivos a la cola con prioridad
    for (const file of filesNeedingLLM) {
      this.queue.enqueueJob({
        filePath: file.filePath,
        needsLLM: true,
        archetypes: file.archetypes,
        fileAnalysis: file.fileAnalysis
      }, file.priority);

      logger.info(`   ➕ Added to queue: ${file.filePath} (${file.priority}) - ${file.archetypes.join(', ')}`);
    }

    logger.info(`   ✅ ${filesNeedingLLM.length} files added to analysis queue`);
    logger.info('   🚀 Starting processing...');

    // Iniciar procesamiento - FILL ALL SLOTS
    const maxConcurrent = this.maxConcurrentAnalyses || 4;
    for (let i = 0; i < maxConcurrent; i++) {
      this._processNext();
    }
  } catch (error) {
    logger.error('   ❌ Error in LLM analysis phase:', error.message);
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
