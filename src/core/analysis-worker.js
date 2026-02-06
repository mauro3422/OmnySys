/**
 * analysis-worker.js
 * Worker que ejecuta el análisis real usando el indexador existente
 */

import fs from 'fs/promises';
import path from 'path';
import { indexProject } from '../layer-a-static/indexer.js';
import { getFileAnalysis } from '../layer-a-static/storage/query-service.js';

export class AnalysisWorker {
  constructor(rootPath, callbacks = {}) {
    this.rootPath = rootPath;
    this.callbacks = callbacks;
    this.isInitialized = false;
    this.isPaused = false;
    this.currentAbortController = null;
    this.analyzedFiles = new Set();
  }
  
  /**
   * Inicializa el worker
   */
  async initialize() {
    console.log('🔧 Initializing AnalysisWorker...');
    this.isInitialized = true;
    console.log('✅ AnalysisWorker ready');
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
    // Debug: Verificar estructura del job
    console.log(`🔍 DEBUG Worker: Received job`, typeof job, job ? Object.keys(job) : 'null');
    console.log(`🔍 DEBUG Worker: job.filePath =`, job?.filePath, typeof job?.filePath);
    
    if (this.isPaused) {
      console.log(`⏸️  Worker paused, delaying ${path.basename(job.filePath)}`);
      return;
    }
    
    this.currentAbortController = new AbortController();
    const { signal } = this.currentAbortController;
    
    // FIX: Guardar estado anterior del archivo para posible rollback
    let previousAnalysis = null;
    try {
      previousAnalysis = await getFileAnalysis(this.rootPath, job.filePath);
    } catch {
      // No había análisis previo, es un archivo nuevo
      previousAnalysis = null;
    }
    
    try {
      this.callbacks.onProgress?.(job, 10);
      
      let result;
      
      // Si el job necesita LLM, usar LLMAnalyzer
      if (job.needsLLM) {
        console.log(`🤖 Using LLM analysis for ${path.basename(job.filePath)}`);
        console.log(`   📋 Archetypes: ${job.archetypes?.join(', ') || 'default'}`);
        
        const { LLMAnalyzer } = await import('../layer-b-semantic/llm-analyzer.js');
        const { buildPromptMetadata } = await import('../layer-b-semantic/metadata-contract.js');
        const { loadAIConfig } = await import('../ai/llm-client.js');
        const { saveFileAnalysis } = await import('../layer-a-static/storage/storage-manager.js');
        const aiConfig = await loadAIConfig();
        
        console.log(`   🔌 Initializing LLM analyzer...`);
        const llmAnalyzer = new LLMAnalyzer(aiConfig, this.rootPath);
        const initialized = await llmAnalyzer.initialize();
        
        if (!initialized) {
          throw new Error('LLM not available');
        }
        console.log(`   ✅ LLM analyzer ready`);
        
        const promptMetadata = buildPromptMetadata(job.filePath, job.fileAnalysis);
        
        console.log(`   📊 Metadata prepared: ${promptMetadata.semanticConnections?.length || 0} semantic connections`);
        
        // Analizar con LLM incluyendo conexiones semánticas
        console.log(`   🚀 Sending to LLM...`);
        let code = job.fileAnalysis?.content || '';
        if (!code) {
          try {
            const absolutePath = path.join(this.rootPath, job.filePath);
            code = await fs.readFile(absolutePath, 'utf-8');
          } catch (readError) {
            console.warn(`   ⚠️  Could not read file content for ${job.filePath}: ${readError.message}`);
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
          console.warn(`   ⚠️  LLM returned no usable data for ${job.filePath}. Storing low-confidence placeholder.`);
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
        
        result = mergedResult;
        
      } else {
        // Análisis estático simple con indexProject
        console.log(`📊 Using static analysis for ${path.basename(job.filePath)}`);
        
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
      }
      
      this.callbacks.onProgress?.(job, 100);
      
      this.analyzedFiles.add(job.filePath);
      this.callbacks.onComplete?.(job, result);
      
    } catch (error) {
      if (error.message === 'Analysis aborted') {
        console.log(`⏹️  Analysis aborted for ${path.basename(job.filePath)}`);
      } else {
        // FIX: Rollback - restaurar análisis anterior si existe
        if (previousAnalysis) {
          console.warn(`⚠️  Analysis failed for ${path.basename(job.filePath)}, restoring previous analysis`);
          try {
            // Re-escribir el análisis anterior al disco
            const { saveFileAnalysis } = await import('../layer-a-static/storage/storage-manager.js');
            await saveFileAnalysis(this.rootPath, job.filePath, previousAnalysis);
            console.log(`🔄 Restored previous analysis for ${path.basename(job.filePath)}`);
          } catch (rollbackError) {
            console.error(`❌ Failed to rollback analysis for ${job.filePath}:`, rollbackError.message);
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
    console.log('⏸️  Pausing worker...');
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
    console.log('▶️  Resuming worker...');
    this.isPaused = false;
  }
  
  /**
   * Detiene el worker
   */
  async stop() {
    console.log('🛑 Stopping worker...');
    this.isPaused = true;
    
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    this.isInitialized = false;
  }
}
