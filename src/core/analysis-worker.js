/**
 * analysis-worker.js
 * Worker que ejecuta el análisis real usando el indexador existente
 */

import { indexProject } from '../layer-a-static/indexer.js';
import { getFileAnalysis } from '../layer-a-static/storage/query-service.js';
import path from 'path';

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
        
        // Calcular métricas semánticas
        const semanticAccess = job.fileAnalysis?.semanticAnalysis?.sharedState?.globalAccess || [];
        const semanticWrites = semanticAccess.filter(item => item.type === 'write');
        const semanticReads = semanticAccess.filter(item => item.type === 'read');
        const eventEmitters = job.fileAnalysis?.semanticAnalysis?.eventPatterns?.eventEmitters || [];
        const eventListeners = job.fileAnalysis?.semanticAnalysis?.eventPatterns?.eventListeners || [];
        const semanticConnections = job.fileAnalysis?.semanticConnections || [];
        
        console.log(`   📊 Metadata prepared: ${semanticConnections.length} semantic connections`);
        
        // Analizar con LLM incluyendo conexiones semánticas
        console.log(`   🚀 Sending to LLM...`);
        const llmResults = await llmAnalyzer.analyzeMultiple([{
          filePath: job.filePath,
          code: job.fileAnalysis?.content || '',
          staticAnalysis: job.fileAnalysis?.semanticAnalysis,
          metadata: {
            filePath: job.filePath,
            exportCount: job.fileAnalysis?.exports?.length || 0,
            dependentCount: job.fileAnalysis?.dependents?.length || 0,
            // NUEVO: Métricas semánticas críticas
            semanticDependentCount: semanticConnections.length,
            definesGlobalState: semanticWrites.length > 0,
            usesGlobalState: semanticReads.length > 0,
            globalStateWrites: semanticWrites.map(w => w.propName || w.property || w.fullReference).filter(Boolean),
            globalStateReads: semanticReads.map(r => r.propName || r.property || r.fullReference).filter(Boolean),
            hasEventEmitters: eventEmitters.length > 0,
            hasEventListeners: eventListeners.length > 0,
            eventNames: [...new Set([
              ...eventEmitters.map(e => e.event || e.name || e.eventName || String(e)),
              ...eventListeners.map(l => l.event || l.name || l.eventName || String(l))
            ])].slice(0, 10),
            semanticConnections: semanticConnections.map(c => ({
              target: c.target,
              type: c.type,
              key: c.key
            })).slice(0, 5),
            ...job.fileAnalysis?.metadata
          },
          analysisType: job.archetypes?.[0] || 'default'
        }]);
        
        if (signal.aborted) {
          throw new Error('Analysis aborted');
        }
        
        const llmResult = llmResults[0];
        
        if (!llmResult) {
          throw new Error('LLM analysis failed');
        }
        
        // Merge resultado LLM con análisis existente
        const mergedResult = {
          ...job.fileAnalysis,
          llmInsights: {
            confidence: llmResult.confidence,
            reasoning: llmResult.reasoning,
            analysisType: llmResult.analysisType || job.archetypes?.[0] || 'default',
            enhancedConnections: llmResult.suggestedConnections || [],
            suggestedConnections: llmResult.suggestedConnections || [],
            hiddenConnections: llmResult.hiddenConnections || [],
            iterationRefined: job.isIterative || false,
            // Campos específicos según el tipo
            ...(llmResult.isOrphan !== undefined && {
              orphanAnalysis: {
                isOrphan: llmResult.isOrphan,
                potentialUsage: llmResult.potentialUsage || [],
                suggestedUsage: llmResult.suggestedUsage || ''
              }
            }),
            ...(llmResult.riskLevel && {
              godObjectAnalysis: {
                isGodObject: llmResult.riskLevel !== 'none',
                riskLevel: llmResult.riskLevel,
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
