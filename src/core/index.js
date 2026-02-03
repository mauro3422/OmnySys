/**
 * core/index.js
 * API pública del sistema core (Orchestrator)
 */

export { AnalysisQueue } from './analysis-queue.js';
export { StateManager } from './state-manager.js';
export { AnalysisWorker } from './analysis-worker.js';

// Función helper para iniciar el orchestrator
export async function startOrchestrator(rootPath, options = {}) {
  const { port = 9999 } = options;
  
  // Importar dinámicamente para evitar circular deps
  const { default: startServer } = await import('./orchestrator-server.js');
  
  process.env.ORCHESTRATOR_PORT = port;
  process.argv[2] = rootPath;
  
  return startServer;
}

// Función para conectar al orchestrator
export async function connectToOrchestrator(port = 9999) {
  const baseUrl = `http://localhost:${port}`;
  
  return {
    async prioritize(filePath, priority = 'low') {
      const response = await fetch(`${baseUrl}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prioritize',
          filePath,
          priority,
          requestId: generateUUID()
        })
      });
      return response.json();
    },
    
    async getStatus() {
      const response = await fetch(`${baseUrl}/status`);
      return response.json();
    },
    
    async getHealth() {
      const response = await fetch(`${baseUrl}/health`);
      return response.json();
    },
    
    async restart() {
      const response = await fetch(`${baseUrl}/restart`, { method: 'POST' });
      return response.json();
    }
  };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
