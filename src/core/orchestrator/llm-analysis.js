import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { safeReadJson } from '#utils/json-safe.js';
import { createLogger } from '../../utils/logger.js';
import { getDecisionAuditLogger } from '../../layer-c-memory/shadow-registry/audit-logger.js';
import { LLMService } from '../../services/llm-service/index.js';

const logger = createLogger('OmnySys:llm:analysis');

/**
 * Calcula hash MD5 del contenido de un archivo
 * @param {string} fullPath - Ruta absoluta al archivo
 * @returns {Promise<string|null>} - Hash MD5 o null si hay error
 */
async function calculateContentHash(fullPath) {
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

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
 */
export async function _analyzeComplexFilesWithLLM() {
  logger.info('\n🤖 Orchestrator: Analyzing complex files with LLM...');

  try {
    // Importar dependencias dinámicamente
    const { LLMAnalyzer } = await import('../../layer-b-semantic/llm-analyzer/index.js');
    const { getFileAnalysis } = await import('../../layer-c-memory/query/apis/file-api.js');
    const { detectArchetypes } = await import('../../layer-b-semantic/prompt-engine/prompt-registry/index.js');
    const { buildPromptMetadata } = await import('../../layer-b-semantic/metadata-contract/index.js');

    // Usar LLMService para verificar disponibilidad
    const llmService = await LLMService.getInstance();
    const llmReady = await llmService.waitForAvailable(20000); // 20s timeout
    
    if (!llmReady) {
      logger.info('   ⚠️  LLM not available, skipping LLM analysis');
      return;
    }
    
    logger.info('   ✅ LLM server is available (via LLMService)');

    // Inicializar LLM Analyzer con el cliente del servicio
    // Esto evita crear una nueva conexión HTTP
    const aiConfig = await (await import('../../ai/llm-client.js')).loadAIConfig();
    const llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
    
    // Usar el cliente del servicio (compartido) en lugar de crear uno nuevo
    llmAnalyzer.client = llmService.client;
    llmAnalyzer.initialized = true;
    logger.info('   ✅ LLM analyzer initialized with shared client');

    // Leer índice de archivos analizados por Layer A
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    const index = await safeReadJson(indexPath, { fileIndex: {} });

    if (!index || !index.fileIndex) {
      logger.info('   ⚠️  No valid index found, skipping LLM analysis');
      return;
    }

    const filesNeedingLLM = [];
    let skippedUnchanged = 0;
    let skippedHasLLM = 0;

    // 🆕 v0.9.33: REMOVED MAX_LLM_PER_RUN
    // Filosofía: El sistema debe procesar TODOS los archivos que necesiten LLM.
    // El análisis estático (átomos + metadatos + graph) debe ser suficiente
    // para que la mayoría de archivos NO necesiten LLM.
    // Si muchos archivos necesitan LLM, el problema está en el análisis estático,
    // no en limitar artificialmente el procesamiento.
    // 
    // El sistema de background + contentHash comparison maneja el load.

    // Revisar cada archivo en el índice - PROCESAMIENTO PARALELO POR BATCHES
    const entries = Object.entries(index.fileIndex || {});
    const BATCH_SIZE = 5; // Mantener en 5 para evitar problemas de memoria
    const totalFiles = entries.length;

    logger.info(`   📁 Scanning ${totalFiles} files in index...`);

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      // Procesar batch en paralelo
      await Promise.all(batch.map(async ([filePath, fileInfo]) => {
        // 🆕 v0.9.32: Verificar si el archivo cambió desde el último análisis
        // comparando el hash guardado en el index vs el hash actual
        const fullPath = path.join(this.projectPath, filePath);
        const currentHash = await calculateContentHash(fullPath);
        const lastHash = fileInfo.hash;

        // Si el hash es igual y ya tiene LLM insights, skippear completamente
        if (currentHash && lastHash && currentHash === lastHash) {
          // Archivo sin cambios - verificar si ya tiene análisis LLM
          const fileAnalysis = await getFileAnalysis(this.projectPath, filePath);
          if (fileAnalysis?.llmInsights) {
            skippedUnchanged++;
            return; // Sin cambios y ya procesado
          }
        }

        // Obtener análisis completo del archivo
        const fileAnalysis = await getFileAnalysis(this.projectPath, filePath);
        if (!fileAnalysis) return;

        // Verificar si ya fue procesado por LLM
        if (fileAnalysis.llmInsights) {
          skippedHasLLM++;
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

        // Loguear decisión arquitectónica
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
            // fileAnalysis NOT stored here — worker loads it fresh from disk
            // Storing it here + in queue caused OOM with 200+ files (3.6GB)
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

    // Log de estadísticas de filtrado
    logger.info(`   📊 Scan complete: ${totalFiles} total | ${skippedUnchanged} unchanged (skipped) | ${skippedHasLLM} already have LLM`);

    if (filesNeedingLLM.length === 0) {
      logger.info('   ℹ️  No files need LLM analysis (static analysis sufficient)');
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
        archetypes: file.archetypes
        // fileAnalysis NOT passed — worker loads it from disk in runLayerAAnalysis()
      }, file.priority);

      logger.info(`   ➕ Added to queue: ${file.filePath} (${file.priority}) - ${file.archetypes.join(', ')}`);
    }

    logger.info(`   ✅ ${filesNeedingLLM.length} files added to analysis queue`);
    
    // MEMORY CLEANUP: Clear the array to free memory before processing
    const fileCount = filesNeedingLLM.length;
    filesNeedingLLM.length = 0; // Clear array but keep reference
    
    logger.info('   🚀 Starting processing...');

    // Iniciar procesamiento - FILL ALL SLOTS (máximo 2 para GPU)
    const maxConcurrent = Math.min(this.maxConcurrentAnalyses || 2, 2); // Max 2 for GPU
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
