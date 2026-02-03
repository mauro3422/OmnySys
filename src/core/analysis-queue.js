/**
 * analysis-queue.js
 * Cola de prioridad para trabajos de análisis
 * 
 * Prioridades: CRITICAL > HIGH > MEDIUM > LOW
 */

export class AnalysisQueue {
  constructor() {
    // Cuatro colas separadas por prioridad
    this.queues = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    // Tracking de archivos encolados (evitar duplicados)
    this.enqueuedFiles = new Set();
  }
  
  /**
   * Agrega un archivo a la cola con prioridad
   * @param {string} filePath - Ruta del archivo
   * @param {string} priority - 'critical' | 'high' | 'medium' | 'low'
   * @returns {number} - Posición en la cola (0 = siguiente a procesar)
   */
  enqueue(filePath, priority = 'low') {
    // Normalizar prioridad
    const validPriority = this.normalizePriority(priority);
    
    // Verificar si ya está encolado
    if (this.enqueuedFiles.has(filePath)) {
      // Si la nueva prioridad es mayor, mover a cola superior
      this.reprioritize(filePath, validPriority);
      return this.getPosition(filePath);
    }
    
    // Agregar a la cola correspondiente
    this.queues[validPriority].push({
      filePath,
      priority: validPriority,
      enqueuedAt: Date.now()
    });
    
    this.enqueuedFiles.add(filePath);
    
    return this.getPosition(filePath);
  }
  
  /**
   * Obtiene el siguiente trabajo de mayor prioridad
   * @returns {object|null} - Trabajo o null si vacío
   */
  dequeue() {
    // Buscar en orden de prioridad
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      if (this.queues[priority].length > 0) {
        const job = this.queues[priority].shift();
        this.enqueuedFiles.delete(job.filePath);
        return job;
      }
    }
    
    return null;
  }
  
  /**
   * Ver el siguiente trabajo sin sacarlo
   * @returns {object|null}
   */
  peek() {
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority][0];
      }
    }
    return null;
  }
  
  /**
   * Obtener posición de un archivo en la cola
   */
  getPosition(filePath) {
    let position = 0;
    
    // Contar trabajos de mayor prioridad primero
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      const index = this.queues[priority].findIndex(j => j.filePath === filePath);
      if (index !== -1) {
        return position + index;
      }
      position += this.queues[priority].length;
    }
    
    return -1; // No encontrado
  }
  
  /**
   * Cambiar prioridad de un archivo ya encolado
   */
  reprioritize(filePath, newPriority) {
    // Encontrar y remover de cola actual
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      const index = this.queues[priority].findIndex(j => j.filePath === filePath);
      if (index !== -1) {
        const [job] = this.queues[priority].splice(index, 1);
        // Agregar a nueva cola
        job.priority = newPriority;
        job.reprioritizedAt = Date.now();
        this.queues[newPriority].push(job);
        return;
      }
    }
  }
  
  /**
   * Obtener todas las colas
   */
  getAll() {
    return {
      critical: [...this.queues.critical],
      high: [...this.queues.high],
      medium: [...this.queues.medium],
      low: [...this.queues.low]
    };
  }
  
  /**
   * Total de trabajos en cola
   */
  size() {
    return this.enqueuedFiles.size;
  }
  
  /**
   * Verificar si un archivo está en cola
   */
  has(filePath) {
    return this.enqueuedFiles.has(filePath);
  }
  
  /**
   * Limpiar todas las colas
   */
  clear() {
    this.queues.critical = [];
    this.queues.high = [];
    this.queues.medium = [];
    this.queues.low = [];
    this.enqueuedFiles.clear();
  }
  
  /**
   * Normalizar nombre de prioridad
   */
  normalizePriority(priority) {
    const valid = ['critical', 'high', 'medium', 'low'];
    const normalized = priority?.toLowerCase();
    return valid.includes(normalized) ? normalized : 'low';
  }
}
