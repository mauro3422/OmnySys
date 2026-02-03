/**
 * tools-with-orchestrator.js
 * Herramientas MCP que usan el Orchestrator para análisis prioritario
 */

import { connectToOrchestrator } from '../core/index.js';
import { getFileAnalysis } from '../layer-a-static/storage/query-service.js';

let orchestratorClient = null;

/**
 * Inicializa conexión al orchestrator
 */
async function getOrchestratorClient() {
  if (!orchestratorClient) {
    orchestratorClient = await connectToOrchestrator(9999);
  }
  return orchestratorClient;
}

/**
 * Tool: get_file_context
 * Obtiene contexto de un archivo, priorizando si es necesario
 */
export async function getFileContext(filePath, rootPath) {
  try {
    // 1. Intentar obtener de caché/inmediato
    const cached = await getFileAnalysis(rootPath, filePath);
    if (cached) {
      return {
        status: 'ready',
        source: 'cache',
        data: formatFileContext(cached)
      };
    }
    
    // 2. No está analizado, priorizar via orchestrator
    const client = await getOrchestratorClient();
    const result = await client.prioritize(filePath, 'critical');
    
    if (result.status === 'completed') {
      // Ya estaba analizado (race condition)
      const analysis = await getFileAnalysis(rootPath, filePath);
      return {
        status: 'ready',
        source: 'completed',
        data: formatFileContext(analysis)
      };
    }
    
    if (result.status === 'analyzing') {
      // Se está analizando ahora, esperar
      const analysis = await waitForAnalysis(rootPath, filePath, 10000);
      if (analysis) {
        return {
          status: 'ready',
          source: 'analyzed',
          data: formatFileContext(analysis)
        };
      }
    }
    
    // Está en cola
    return {
      status: 'queued',
      position: result.position,
      estimatedTime: result.estimatedTime,
      message: `Archivo en cola de prioridad (posición ${result.position})`
    };
    
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Tool: check_system_health
 * Verifica estado del sistema CogniSystem
 */
export async function checkSystemHealth() {
  try {
    const client = await getOrchestratorClient();
    const health = await client.getHealth();
    const status = await client.getStatus();
    
    return {
      status: health.status,
      orchestrator: status.orchestrator.status,
      queueSize: status.queue ? 
        status.queue.critical.length + 
        status.queue.high.length + 
        status.queue.medium.length + 
        status.queue.low.length : 0,
      currentJob: status.currentJob,
      progress: status.currentJob?.progress || 0,
      stats: status.stats,
      recommendations: generateRecommendations(health, status)
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      recommendations: ['Verificar que el orchestrator esté corriendo: npm run orchestrator']
    };
  }
}

/**
 * Tool: restart_orchestrator
 * Reinicia el sistema
 */
export async function restartOrchestrator() {
  try {
    const client = await getOrchestratorClient();
    const result = await client.restart();
    return {
      status: 'restarted',
      message: 'Orchestrator reiniciado correctamente'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Tool: get_queue_status
 * Obtiene estado de la cola
 */
export async function getQueueStatus() {
  try {
    const client = await getOrchestratorClient();
    const status = await client.getStatus();
    
    return {
      current: status.currentJob,
      queue: status.queue,
      total: status.queue ? 
        status.queue.critical.length + 
        status.queue.high.length + 
        status.queue.medium.length + 
        status.queue.low.length : 0,
      stats: status.stats
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// ============ HELPERS ============

async function waitForAnalysis(rootPath, filePath, timeoutMs) {
  const start = Date.now();
  const interval = 500; // chequear cada 500ms
  
  while (Date.now() - start < timeoutMs) {
    const analysis = await getFileAnalysis(rootPath, filePath);
    if (analysis) {
      return analysis;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return null; // Timeout
}

function formatFileContext(analysis) {
  return {
    filePath: analysis.filePath,
    exports: analysis.exports?.map(e => e.name) || [],
    imports: analysis.imports?.map(i => i.source) || [],
    functions: analysis.definitions
      ?.filter(d => d.type === 'function')
      .map(f => ({
        name: f.name,
        params: f.params,
        line: f.line
      })) || [],
    semanticConnections: analysis.semanticConnections || [],
    sideEffects: analysis.sideEffects || {},
    riskScore: analysis.riskScore || 0
  };
}

function generateRecommendations(health, status) {
  const recs = [];
  
  if (health.status !== 'healthy') {
    recs.push('El sistema no está saludable. Considere reiniciar.');
  }
  
  if (health.llmConnection !== 'ok') {
    recs.push('Conexión con LLM fallida. Verifique que el servidor LLM esté corriendo.');
  }
  
  const queueSize = status.queue ? 
    status.queue.critical.length + 
    status.queue.high.length + 
    status.queue.medium.length + 
    status.queue.low.length : 0;
    
  if (queueSize > 50) {
    recs.push(`Hay ${queueSize} archivos en cola. Considere esperar antes de hacer más cambios.`);
  }
  
  return recs;
}
