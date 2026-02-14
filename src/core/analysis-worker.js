/**
 * analysis-worker.js
 * Worker que ejecuta el análisis real usando el indexador existente
 * 
 * ARQUITECTURA:
 * - Recibe LLMService por inyección de dependencias
 * - Usa el servicio singleton compartido
 * - Mantiene backwards compatibility con getter/setter legacy
 */

import fs from 'fs/promises';
import path from 'path';
import { indexProject } from '../layer-a-static/indexer.js';
import { getFileAnalysis } from '../layer-a-static/query/apis/file-api.js';
import { createLogger } from '../shared/logger-system.js';
import { LLMService } from '../services/llm-service.js';

const logger = createLogger('OmnySys:core:analysis-worker');

export class AnalysisWorker {
  /**
   * @param {string} rootPath - Ruta raíz del proyecto
   * @param {object} options - Opciones
   * @param {LLMService} options.llmService - Servicio LLM (opcional, usa singleton por defecto)
   * @param {object} callbacks - Callbacks
   */
  constructor(rootPath, options = {}, callbacks = {}) {
    // Handle both signatures: constructor(rootPath, callbacks) and constructor(rootPath, options, callbacks)
    if (typeof options === 'function' || options.onProgress || options.onComplete || options.onError) {
      callbacks = options;
      options = {};
    }
    
    this.rootPath = rootPath;
    this.callbacks = callbacks;
    this.options = options;
    this.isInitialized = false;
    this.isPaused = false;
    this.currentAbortController = null;
    this.analyzedFiles = new Set();
    
    // LLM Service - puede ser inyectado o se obtiene el singleton
    this._llmService = options.llmService || null;
    this._llmServiceReady = false;
  }
  
  /**
   * @deprecated Usar llmService en lugar de llmAnalyzer
   * Getter para compatibilidad con código legacy
   */
  get llmAnalyzer() {
    logger.debug('⚠️  [DEPRECATED] Accessing llmAnalyzer, use llmService instead');
    return this._llmService;
  }
  
  /**
   * @deprecated El servicio se inyecta en el constructor
   * Setter para compatibilidad (no-op, servicio se maneja internamente)
   */
  set llmAnalyzer(analyzer) {
    logger.debug('⚠️  [DEPRECATED] Setting llmAnalyzer is deprecated, use constructor injection');
    // No-op: El servicio se obtiene del singleton o se inyecta
  }

  /**
   * Obtiene el servicio LLM (lazy initialization del singleton)
   * @private
   */
  async _getLLMService() {
    if (this._llmService && this._llmServiceReady) {
      return this._llmService;
    }
    
    // Obtener singleton si no fue inyectado
    if (!this._llmService) {
      this._llmService = await LLMService.getInstance();
    }
    
    // Esperar a que esté disponible
    const available = await this._llmService.waitForAvailable(5000);
    this._llmServiceReady = available;
    
    return available ? this._llmService : null;
  }

  /**
   * Inicializa el worker
   */
  async initialize() {
    logger.info('Initializing AnalysisWorker...');
    
    // Pre-inicializar LLMService si no fue inyectado
    if (!this._llmService) {
      try {
        this._llmService = await LLMService.getInstance();
        logger.info('✅ LLMService obtained');
      } catch (err) {
        logger.warn('⚠️  Could not pre-initialize LLMService:', err.message);
        // No es crítico, se intentará lazy más tarde
      }
    }
    
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
    return this.isInitialized && !this.isPaused;
  }

  /**
   * Pausa el worker
   */
  pause() {
    this.isPaused = true;
    this.currentAbortController?.abort();
  }

  /**
   * Reanuda el worker
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Detiene el worker
   */
  async stop() {
    this.isInitialized = false;
    this.currentAbortController?.abort();
    this._llmService = null;
    this._llmServiceReady = false;
  }

  /**
   * Analiza un archivo
   */
  async analyze(job) {
    const jobId = Math.random().toString(36).substring(2, 8);
    console.log(`[Worker:${jobId}] ✅ START analyze() for ${job.filePath}`);
    console.log(`[Worker:${jobId}] job.needsLLM = ${job.needsLLM}`);

    if (this.isPaused) {
      console.log(`[Worker:${jobId}] Worker is PAUSED, returning early`);
      return;
    }

    this.currentAbortController = new AbortController();
    const { signal } = this.currentAbortController;

    try {
      this.callbacks.onProgress?.(job, 10);

      // PASO 1: Re-analizar con Layer A (análisis estático)
      logger.info(`📊 Re-analyzing with Layer A: ${path.basename(job.filePath)}`);
      try {
        const { analyzeSingleFile } = await import('../layer-a-static/pipeline/single-file.js');
        const layerAResult = await analyzeSingleFile(this.rootPath, job.filePath, {
          verbose: false,
          incremental: true
        });

        job.fileAnalysis = {
          ...job.fileAnalysis,
          ...layerAResult,
          reanalyzedAt: new Date().toISOString()
        };

        logger.info(`   ✅ Layer A analysis complete`);
      } catch (layerAError) {
        logger.warn(`   ⚠️  Layer A analysis failed: ${layerAError.message}`);
      }

      this.callbacks.onProgress?.(job, 50);

      let result;

      // PASO 2: Si el job necesita LLM
      if (job.needsLLM) {
        logger.info(`🤖 Using LLM analysis for ${path.basename(job.filePath)}`);
        logger.info(`   📋 Archetypes: ${job.archetypes?.join(', ') || 'default'}`);

        // Obtener servicio LLM
        const llmService = await this._getLLMService();
        console.log(`[Worker:${jobId}] LLM service = ${!!llmService}`);
        
        if (!llmService) {
          logger.warn(`   ⚠️  LLM not available, using static analysis only`);
          // Fallback a análisis estático
          result = await getFileAnalysis(this.rootPath, job.filePath);
        } else {
          const { buildPromptMetadata } = await import('../layer-b-semantic/metadata-contract.js');
          const { saveFileAnalysis } = await import('../layer-a-static/storage/storage-manager.js');

          logger.info(`   ✅ Using LLM service`);

          const promptMetadata = buildPromptMetadata(job.filePath, job.fileAnalysis);
          logger.info(`   📊 Metadata prepared`);

          // Analizar con LLM
          logger.info(`   🚀 Sending to LLM...`);
          let code = job.fileAnalysis?.content || '';
          if (!code) {
            try {
              const absolutePath = path.join(this.rootPath, job.filePath);
              code = await fs.readFile(absolutePath, 'utf-8');
            } catch (readError) {
              logger.warn(`   ⚠️  Could not read file: ${readError.message}`);
              code = '';
            }
          }

          // Usar LLMAnalyzer a través del servicio
          // El servicio expone el cliente interno para casos avanzados
          const llmResults = await this._analyzeWithLLM(llmService, [{
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
            logger.warn(`   ⚠️  LLM returned no usable data`);
            llmResult = {
              confidence: 0.0,
              reasoning: 'LLM returned no usable data',
              analysisType: job.archetypes?.[0] || 'default',
              suggestedConnections: [],
              hiddenConnections: []
            };
          }

          // Merge resultados
          const mergedResult = {
            ...job.fileAnalysis,
            llmInsights: {
              ...llmResult,
              analyzedAt: new Date().toISOString()
            },
            analysisComplete: true
          };

          await saveFileAnalysis(this.rootPath, job.filePath, mergedResult);
          
          result = mergedResult;
        }
      } else {
        // Análisis estático simple
        logger.info(`📊 Using static analysis for ${path.basename(job.filePath)}`);
        result = await getFileAnalysis(this.rootPath, job.filePath);
      }

      if (signal.aborted) {
        throw new Error('Analysis aborted');
      }

      this.callbacks.onProgress?.(job, 100);
      this.analyzedFiles.add(job.filePath);
      
      logger.info(`✅ Analysis complete for ${path.basename(job.filePath)}`);
      this.callbacks.onComplete?.(job, result);

    } catch (error) {
      if (error.message === 'Analysis aborted') {
        logger.info(`⏹️  Analysis aborted for ${job.filePath}`);
      } else {
        logger.error(`❌ Analysis failed for ${job.filePath}:`, error);
        this.callbacks.onError?.(job, error);
      }
    } finally {
      this.currentAbortController = null;
    }
  }

  /**
   * Analiza archivos usando LLM
   * @private
   */
  async _analyzeWithLLM(llmService, files) {
    // Por ahora, usamos LLMAnalyzer directamente ya que el servicio
    // es más de bajo nivel (cliente HTTP). En el futuro, podríamos
    // mover esta lógica al servicio.
    
    const { LLMAnalyzer } = await import('../layer-b-semantic/llm-analyzer/index.js');
    const { loadAIConfig } = await import('../ai/llm-client.js');
    
    // Crear analyzer temporal con el cliente del servicio
    const aiConfig = await loadAIConfig();
    const analyzer = new LLMAnalyzer(aiConfig, this.rootPath);
    
    // Reemplazar el cliente con el del servicio (compartido)
    if (llmService.client) {
      analyzer.client = llmService.client;
      analyzer.initialized = true;
    } else {
      await analyzer.initialize();
    }
    
    return analyzer.analyzeMultiple(files);
  }
}

export default AnalysisWorker;
