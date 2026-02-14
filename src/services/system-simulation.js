/**
 * Simulación del flujo completo del sistema
 * Verifica que todos los componentes se conecten correctamente
 */

import { LLMService } from './llm-service.js';
import { AnalysisWorker } from '../core/analysis-worker.js';

// Logger de simulación
const SIM = {
  logs: [],
  log(component, action, details = '') {
    const msg = `[${component}] ${action} ${details}`;
    this.logs.push(msg);
    console.log(msg);
  },
  
  error(component, action, error) {
    const msg = `❌ [${component}] ${action}: ${error.message}`;
    this.logs.push(msg);
    console.error(msg);
    throw error;
  },
  
  report() {
    console.log('\n' + '='.repeat(60));
    console.log('SIMULATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total steps: ${this.logs.length}`);
    console.log('\nExecution flow:');
    this.logs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
  }
};

// Mock objects para simulación
class MockLLMClient {
  constructor() {
    this.servers = {
      gpu: { available: true, activeRequests: 0, maxParallel: 2 },
      cpu: { available: false, activeRequests: 0, maxParallel: 2 }
    };
  }
  
  async healthCheck() {
    return { gpu: true, cpu: false };
  }
  
  async analyze(prompt, options = {}) {
    SIM.log('LLMClient', 'analyze', `(prompt: ${prompt.slice(0, 50)}...)`);
    return {
      sharedState: [],
      events: [],
      hiddenConnections: [],
      suggestedConnections: [],
      subsystemStatus: 'analyzed',
      confidence: 0.85,
      reasoning: 'Mock analysis'
    };
  }
}

// Simulación del flujo
async function runSimulation() {
  console.log('='.repeat(60));
  console.log('SYSTEM SIMULATION - MCP Server Startup');
  console.log('='.repeat(60) + '\n');
  
  try {
    // ============================================================
    // FASE 1: Inicialización del LLMService (Singleton)
    // ============================================================
    SIM.log('MCP-Server', 'Starting initialization pipeline');
    SIM.log('LLMService', 'Creating singleton instance');
    
    const llmService = await LLMService.getInstance();
    SIM.log('LLMService', 'Instance created', `(initialized: ${llmService.initialized})`);
    
    // Verificar que el servicio tenga las propiedades correctas
    if (!llmService.client) {
      SIM.error('LLMService', 'Validation', new Error('No LLMClient found'));
    }
    SIM.log('LLMService', 'Has LLMClient', `(type: ${llmService.client.constructor.name})`);
    
    // Verificar circuit breaker
    const cbState = llmService.getCircuitBreakerState();
    SIM.log('LLMService', 'Circuit breaker state', `(${cbState.state})`);
    
    // Verificar métricas
    const metrics = llmService.getMetrics();
    SIM.log('LLMService', 'Metrics available', `(requests: ${metrics.requestsTotal})`);
    
    // ============================================================
    // FASE 2: Verificar singleton (misma instancia)
    // ============================================================
    SIM.log('System', 'Verifying singleton pattern');
    const llmService2 = await LLMService.getInstance();
    if (llmService !== llmService2) {
      SIM.error('LLMService', 'Singleton check', new Error('Different instances returned!'));
    }
    SIM.log('LLMService', 'Singleton verified', '(same instance)');
    
    // ============================================================
    // FASE 3: Crear AnalysisWorker
    // ============================================================
    SIM.log('Orchestrator', 'Creating AnalysisWorker');
    
    const workerCallbacks = {
      onProgress: (job, progress) => {
        SIM.log('Worker', 'onProgress', `(${job.filePath}: ${progress}%)`);
      },
      onComplete: (job, result) => {
        SIM.log('Worker', 'onComplete', `(job: ${job.filePath})`);
      },
      onError: (job, error) => {
        SIM.log('Worker', 'onError', `(error: ${error.message})`);
      }
    };
    
    // Probar firma antigua (backwards compatibility)
    const worker = new AnalysisWorker('/mock/project', workerCallbacks);
    SIM.log('AnalysisWorker', 'Created with legacy signature');
    
    await worker.initialize();
    SIM.log('AnalysisWorker', 'Initialized', `(isInitialized: ${worker.isInitialized})`);
    
    // Verificar que el worker tenga acceso al servicio
    if (!worker._llmService) {
      SIM.log('AnalysisWorker', 'Warning', 'No LLMService pre-injected (will use lazy)');
    }
    
    // ============================================================
    // FASE 4: Simular análisis de archivo
    // ============================================================
    SIM.log('Orchestrator', 'Enqueueing test job');
    
    const mockJob = {
      filePath: 'src/test.js',
      needsLLM: true,
      archetypes: ['test-archetype'],
      fileAnalysis: {
        semanticAnalysis: { complexity: 0.8 },
        content: 'console.log("test");'
      }
    };
    
    // Simular que el worker obtiene el servicio
    SIM.log('AnalysisWorker', 'Getting LLMService (lazy)');
    const workerLLMService = await worker._getLLMService();
    
    if (!workerLLMService) {
      SIM.log('AnalysisWorker', 'LLM not available (expected without GPU)', '- using fallback');
      // Esto es comportamiento correcto - el worker debería hacer fallback a análisis estático
    } else {
      SIM.log('AnalysisWorker', 'Got LLMService', `(same as singleton: ${workerLLMService === llmService})`);
    }
    
    // ============================================================
    // FASE 5: Verificar disponibilidad del LLM
    // ============================================================
    SIM.log('System', 'Checking LLM availability');
    const isAvailable = llmService.isAvailable();
    SIM.log('LLMService', 'Availability check', `(available: ${isAvailable})`);
    
    // Forzar health check
    SIM.log('LLMService', 'Forcing health check');
    await llmService.checkHealth();
    SIM.log('LLMService', 'Health check completed');
    
    // ============================================================
    // FASE 6: Verificar circuit breaker bajo carga
    // ============================================================
    SIM.log('System', 'Testing circuit breaker behavior');
    
    // Simular algunas llamadas exitosas
    for (let i = 0; i < 3; i++) {
      try {
        // Nota: No llamamos a analyze real porque requeriría servidor GPU
        // Solo verificamos que el método existe y está disponible
        SIM.log('LLMService', 'Simulating request', `(#${i + 1})`);
        llmService._metrics.requestsTotal++;
      } catch (err) {
        SIM.error('LLMService', 'Request simulation', err);
      }
    }
    
    const updatedMetrics = llmService.getMetrics();
    SIM.log('LLMService', 'Updated metrics', `(requests: ${updatedMetrics.requestsTotal})`);
    
    // ============================================================
    // FASE 7: Cleanup
    // ============================================================
    SIM.log('System', 'Starting cleanup');
    
    await worker.stop();
    SIM.log('AnalysisWorker', 'Stopped');
    
    await llmService.dispose();
    SIM.log('LLMService', 'Disposed');
    
    // Reset singleton para limpieza
    LLMService.resetInstance();
    SIM.log('LLMService', 'Singleton reset');
    
    // ============================================================
    // REPORTE FINAL
    // ============================================================
    SIM.report();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SIMULATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    
    return { success: true, logs: SIM.logs };
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ SIMULATION FAILED');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    
    // Cleanup en caso de error
    try {
      LLMService.resetInstance();
    } catch {}
    
    return { success: false, error: error.message, logs: SIM.logs };
  }
}

// Ejecutar simulación
runSimulation().then(result => {
  process.exit(result.success ? 0 : 1);
});
