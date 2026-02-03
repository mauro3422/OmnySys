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
   */
  async analyze(job) {
    if (this.isPaused) {
      console.log(`⏸️  Worker paused, delaying ${path.basename(job.filePath)}`);
      return;
    }
    
    this.currentAbortController = new AbortController();
    const { signal } = this.currentAbortController;
    
    try {
      this.callbacks.onProgress?.(job, 10);
      
      // Usar indexProject en modo single-file
      await indexProject(this.rootPath, {
        verbose: false,
        singleFile: job.filePath,
        incremental: true,
        abortSignal: signal
      });
      
      if (signal.aborted) {
        throw new Error('Analysis aborted');
      }
      
      this.callbacks.onProgress?.(job, 100);
      
      // Obtener resultado
      const result = await getFileAnalysis(this.rootPath, job.filePath);
      
      this.analyzedFiles.add(job.filePath);
      this.callbacks.onComplete?.(job, result);
      
    } catch (error) {
      if (error.message === 'Analysis aborted') {
        console.log(`⏹️  Analysis aborted for ${path.basename(job.filePath)}`);
      } else {
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
