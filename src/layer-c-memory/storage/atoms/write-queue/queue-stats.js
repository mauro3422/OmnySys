/**
 * @fileoverview Write Queue - Task Statistics
 *
 * Maneja estadísticas de tareas de la cola.
 *
 * @module layer-c-memory/storage/atoms/write-queue/queue-stats
 */

/**
 * Crea objeto de estadísticas inicial
 * @returns {Object} Estadísticas iniciales
 */
export function createStats() {
  return {
    total: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    emfileRetries: 0,
    avgWaitTime: 0,
    avgExecTime: 0
  };
}

/**
 * Actualiza estadísticas después de completar una tarea
 * @param {Object} stats - Estadísticas actuales
 * @param {boolean} success - Si la tarea fue exitosa
 * @param {number} execTime - Tiempo de ejecución en ms
 * @returns {Object} Estadísticas actualizadas
 */
export function updateStats(stats, success, execTime) {
  const newStats = { ...stats };
  newStats.execTimeSum = (stats.execTimeSum || 0) + execTime;
  newStats.completed = success ? stats.completed + 1 : stats.completed;
  newStats.failed = success ? stats.failed : stats.failed + 1;
  newStats.avgExecTime = newStats.execTimeSum / newStats.completed;
  return newStats;
}

/**
 * Registra un reintento EMFILE
 * @param {Object} stats - Estadísticas actuales
 * @returns {Object} Estadísticas actualizadas
 */
export function recordEMFILE(stats) {
  return {
    ...stats,
    retried: stats.retried + 1,
    emfileRetries: stats.emfileRetries + 1
  };
}

/**
 * Evalúa la salud del sistema
 * @param {Object} stats - Estadísticas
 * @param {number} queueLength - Longitud actual de la cola
 * @param {number} queueLimit - Límite de la cola
 * @returns {string} Estado de salud
 */
export function assessHealth(stats, queueLength, queueLimit) {
  const queueRatio = queueLength / queueLimit;

  if (stats.emfileRetries > 10) return 'critical';
  if (queueRatio > 0.8) return 'warning';
  if (stats.avgExecTime > 1000) return 'slow';
  return 'healthy';
}

/**
 * Calcula el estado actual de la cola
 * @param {Object} stats - Estadísticas
 * @param {number} pending - Tareas pendientes
 * @param {number} active - Tareas activas
 * @param {boolean} paused - Si está pausado
 * @param {number} concurrency - Concurrencia actual
 * @param {number} queueLimit - Límite de la cola
 * @returns {Object} Estado completo
 */
export function getStatus(stats, pending, active, paused, concurrency, queueLimit) {
  return {
    pending,
    active,
    idle: active === 0 && pending === 0,
    paused,
    concurrency,
    queueLimit,
    stats: { ...stats },
    health: assessHealth(stats, pending, queueLimit)
  };
}

export default {
  createStats,
  updateStats,
  recordEMFILE,
  assessHealth,
  getStatus
};
