/**
 * analysis-worker.js
 * Worker que ejecuta el análisis real usando el indexador existente
 */

import fs from 'fs/promises';
import path from 'path';
import { indexProject } from '../layer-a-static/indexer.js';
import { getFileAnalysis } from '../layer-a-static/query/apis/file-api.js';
import { createLogger } from '../shared/logger-system.js';

const logger = createLogger('OmnySys:core:analysis-worker');

export class AnalysisWorker {
  constructor(rootPath, callbacks = {}, options = {}) {
    this.rootPath = rootPath;
    this.callbacks = callbacks;
    this.isInitialized = false;
    this.isPaused = false;
    this.currentAbortController = null;
    this.analyzedFiles = new Set();
    // OPTIMIZATION: Receive pre-initialized LLMAnalyzer to avoid repeated initialization
    this.llmAnalyzer = options.llmAnalyzer || null;
  }

  /**
   * Inicializa el worker
   */
  async initialize() {
    logger.info('Initializing AnalysisWorker...');
    this.isInitialized = true;
    logger.info('AnalysisWorker ready');
  }

  /**
   * Verifica si un archivo ya fue analizado
   */
  async isAnalyzed(filePath) {
    try {
      const analysis = await getFileAnalysis(this.rootPath, filePath);
      return analysis !== null;
    } catch {
      return false;
    }
  }

  /**
   * Verifica salud del worker
   */
  isHealthy() {
    return this.isInitialized;
  }

  /**
   * Analiza un archivo
   * 
   * FIX: Implementa rollback de caché si el análisis falla.
   * Esto previene que el cache quede en estado inconsistente.
   */
  async analyze(job) {
    const jobId = Math.random().toString(36).substring(2, 8);
    console.log(`[Worker:${jobId}] ✅ START analyze() for ${job.filePath}`);
    console.log(`[Worker:${jobId}] job.needsLLM = ${job.needsLLM}, job.archetypes = ${JSON.stringify(job.archetypes)}`);
    console.log(`[Worker:${jobId}] this.llmAnalyzer exists = ${!!this.llmAnalyzer}`);

    // Debug: Verificar estructura del job
    logger.debug('Received job', { type: typeof job, keys: job ? Object.keys(job) : null });
    logger.debug('Job filePath', { path: job?.filePath, type: typeof job?.filePath });

    if (this.isPaused) {
      console.log(`[Worker:${jobId}] Worker is PAUSED, returning early`);
      logger.info(`Worker paused, delaying ${path.basename(job.filePath)}`);
      return;
    }

    console.log(`[Worker:${jobId}] Creating AbortController and getting previous analysis...`);
    this.currentAbortController = new AbortController();
    const { signal } = this.currentAbortController;

    // FIX: Guardar estado anterior del archivo para posible rollback
    let previousAnalysis = null;
    try {
      console.log(`[Worker:${jobId}] Calling getFileAnalysis for ${job.filePath}...`);
      previousAnalysis = await getFileAnalysis(this.rootPath, job.filePath);
      console.log(`[Worker:${jobId}] getFileAnalysis returned: ${previousAnalysis ? 'found' : 'null'}`);
    } catch (err) {
      console.log(`[Worker:${jobId}] getFileAnalysis error: ${err.message}`);
      previousAnalysis = null;
    }

    try {
      this.callbacks.onProgress?.(job, 10);

      let result;

      // PASO 1: Re-analizar con Layer A (análisis estático single-file)
      logger.info(`📊 Re-analyzing with Layer A: ${path.basename(job.filePath)}`);
      try {
        const { analyzeSingleFile } = await import('../layer-a-static/pipeline/single-file.js');
        const layerAResult = await analyzeSingleFile(this.rootPath, job.filePath, {
          verbose: false,
          incremental: true
        });

        // Actualizar el job con el nuevo análisis de Layer A
        job.fileAnalysis = {
          ...job.fileAnalysis,
          ...layerAResult,
          reanalyzedAt: new Date().toISOString()
        };

        logger.info(`   ✅ Layer A analysis complete: ${layerAResult.semanticConnections?.length || 0} connections`);
      } catch (layerAError) {
        logger.warn(`   ⚠️  Layer A analysis failed: ${layerAError.message}`);
        if (layerAError.stack) {
          logger.warn(`   Stack: ${layerAError.stack.split('\n').slice(0, 3).join('\n   ')}`);
        }
        // Continuar con análisis existente
      }

      this.callbacks.onProgress?.(job, 50);

      // PASO 2: Si el job necesita LLM, usar LLMAnalyzer
      if (job.needsLLM) {
        logger.info(`🤖 Using LLM analysis for ${path.basename(job.filePath)}`);
        logger.info(`   📋 Archetypes: ${job.archetypes?.join(', ') || 'default'}`);

        const { buildPromptMetadata } = await import('../layer-b-semantic/metadata-contract.js');
        const { saveFileAnalysis } = await import('../layer-a-static/storage/storage-manager.js');

        // OPTIMIZATION: Use injected LLMAnalyzer instead of creating a new one
        let llmAnalyzer = this.llmAnalyzer;
        if (!llmAnalyzer) {
          // Fallback: create new analyzer only if none was injected (backwards compatibility)
          const { LLMAnalyzer } = await import('../layer-b-semantic/llm-analyzer/index.js');
          const { loadAIConfig } = await import('../ai/llm-client.js');
          const aiConfig = await loadAIConfig();

          logger.info(`   🔌 Initializing LLM analyzer (fallback)...`);
          llmAnalyzer = new LLMAnalyzer(aiConfig, this.rootPath);
          const initialized = await llmAnalyzer.initialize();

          if (!initialized) {
            throw new Error('LLM not available');
          }
          logger.info(`   ✅ LLM analyzer ready`);
        } else {
          logger.info(`   ✅ Using shared LLM analyzer`);
        }

        const promptMetadata = buildPromptMetadata(job.filePath, job.fileAnalysis);

        logger.info(`   📊 Metadata prepared: ${promptMetadata.semanticConnections?.length || 0} semantic connections`);

        // Analizar con LLM incluyendo conexiones semánticas
        logger.info(`   🚀 Sending to LLM...`);
        let code = job.fileAnalysis?.content || '';
        if (!code) {
          try {
            const absolutePath = path.join(this.rootPath, job.filePath);
            code = await fs.readFile(absolutePath, 'utf-8');
          } catch (readError) {
            logger.warn(`   ⚠️  Could not read file content for ${job.filePath}: ${readError.message}`);
            code = '';
          }
        }

        const llmResults = await llmAnalyzer.analyzeMultiple([{
          filePath: job.filePath,
          code,
          staticAnalysis: job.fileAnalysis?.semanticAnalysis,
          metadata: promptMetadata,
          analysisType: job.archetypes?.[0] || 'default'
        }]);

        if (signal.aborted) {
          throw new Error('Analysis aborted');
        }

        let llmResult = llmResults[0];

        if (!llmResult) {
          logger.warn(`   ⚠️  LLM returned no usable data for ${job.filePath}. Storing low-confidence placeholder.`);
          llmResult = {
            confidence: 0.0,
            reasoning: 'LLM returned no usable data or confidence too low',
            analysisType: job.archetypes?.[0] || 'default',
            suggestedConnections: [],
            hiddenConnections: [],
            isOrphan: false
          };
        }

        const { getMergeConfig } = await import('../layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js');
        const analysisType = llmResult.analysisType || job.archetypes?.[0] || 'default';
        const mergeConfig = getMergeConfig(analysisType);
        const archetypePayload = {};
        if (mergeConfig) {
          for (const field of mergeConfig.fields || []) {
            if (llmResult[field] !== undefined) {
              archetypePayload[field] = llmResult[field];
            }
          }
        }

        // Merge resultado LLM con análisis existente
        const mergedResult = {
          ...job.fileAnalysis,
          llmInsights: {
            confidence: llmResult.confidence,
            reasoning: llmResult.reasoning,
            analysisType,
            enhancedConnections: llmResult.suggestedConnections || [],
            suggestedConnections: llmResult.suggestedConnections || [],
            hiddenConnections: llmResult.hiddenConnections || [],
            iterationRefined: job.isIterative || false,
            ...(mergeConfig && Object.keys(archetypePayload).length > 0 && {
              [mergeConfig.mergeKey]: archetypePayload
            }),
            // Campos específicos según el tipo
            ...(llmResult.isOrphan !== undefined && {
              orphanAnalysis: {
                isOrphan: llmResult.isOrphan,
                potentialUsage: llmResult.potentialUsage || [],
                suggestedUsage: llmResult.suggestedUsage || ''
              }
            }),
            ...(((llmResult.isGodObject !== undefined) ||
              llmResult.analysisType === 'god-object' ||
              job.archetypes?.includes('god-object')) && {
              godObjectAnalysis: {
                isGodObject: llmResult.isGodObject !== undefined
                  ? !!llmResult.isGodObject
                  : (llmResult.riskLevel && llmResult.riskLevel !== 'none'),
                riskLevel: llmResult.riskLevel || (llmResult.isGodObject ? 'high' : 'none'),
                responsibilities: llmResult.responsibilities || [],
                impactScore: llmResult.impactScore || 0.5
              }
            })
          },
          llmProcessed: true,
          llmProcessedAt: new Date().toISOString()
        };

        // Guardar resultado mergeado
        await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);
        
        // FIX: Invalidar cache para forzar re-carga en próximas consultas
        // Esto evita que el cache tenga datos viejos cuando el disco tiene lo nuevo
        try {
          const { getCacheInvalidator } = await import('../cache-invalidator/index.js');
          const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
          await invalidator.invalidateSync(job.filePath);
          logger.debug(`   🗑️  Cache invalidated for: ${job.filePath}`);
        } catch (cacheError) {
          logger.warn(`   ⚠️  Failed to invalidate cache for ${job.filePath}:`, cacheError.message);
          // No fallar el análisis si la invalidación de cache falla
        }

        result = mergedResult;

      } else {
        // Análisis estático simple con indexProject
        logger.info(`📊 Using static analysis for ${path.basename(job.filePath)}`);

        await indexProject(this.rootPath, {
          verbose: false,
          singleFile: job.filePath,
          incremental: true,
          abortSignal: signal
        });

        if (signal.aborted) {
          throw new Error('Analysis aborted');
        }

        // Obtener resultado
        result = await getFileAnalysis(this.rootPath, job.filePath);
        
        // FIX: Invalidar cache para forzar re-carga en próximas consultas
        try {
          const { getCacheInvalidator } = await import('../cache-invalidator/index.js');
          const invalidator = getCacheInvalidator({ projectPath: this.rootPath });
          await invalidator.invalidateSync(job.filePath);
          logger.debug(`   🗑️  Cache invalidated after static analysis: ${job.filePath}`);
        } catch (cacheError) {
          logger.warn(`   ⚠️  Failed to invalidate cache for ${job.filePath}:`, cacheError.message);
          // No fallar el análisis si la invalidación de cache falla
        }
      }

      this.callbacks.onProgress?.(job, 100);

      this.analyzedFiles.add(job.filePath);
      logger.info(`✅ Analysis complete for ${job.filePath}, calling onComplete callback`);
      this.callbacks.onComplete?.(job, result);
      logger.info(`✅ onComplete callback done for ${job.filePath}`);

    } catch (error) {
      if (error.message === 'Analysis aborted') {
        logger.info(`⏹️  Analysis aborted for ${path.basename(job.filePath)}`);
      } else {
        // FIX: Rollback - restaurar análisis anterior si existe
        if (previousAnalysis) {
          logger.warn(`⚠️  Analysis failed for ${path.basename(job.filePath)}, restoring previous analysis`);
          try {
            // Re-escribir el análisis anterior al disco
            const { saveFileAnalysis } = await import('../layer-a-static/storage/storage-manager.js');
            await saveFileAnalysis(this.rootPath, job.filePath, previousAnalysis);
            logger.info(`🔄 Restored previous analysis for ${path.basename(job.filePath)}`);
          } catch (rollbackError) {
            logger.error(`❌ Failed to rollback analysis for ${job.filePath}:`, rollbackError.message);
          }
        }

        this.callbacks.onError?.(job, error);
      }
    } finally {
      this.currentAbortController = null;
    }
  }

  /**
   * Pausa el trabajo actual
   */
  async pause() {
    logger.info('⏸️  Pausing worker...');
    this.isPaused = true;

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    // Esperar a que termine el trabajo actual
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Reanuda el worker
   */
  resume() {
    logger.info('▶️  Resuming worker...');
    this.isPaused = false;
  }

  /**
   * Detiene el worker
   */
  async stop() {
    logger.info('🛑 Stopping worker...');
    this.isPaused = true;

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    await new Promise(resolve => setTimeout(resolve, 200));
    this.isInitialized = false;
  }
}
