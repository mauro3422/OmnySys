/**
 * @fileoverview Write Queue - Task Executor
 *
 * Ejecuta tareas con manejo de errores EMFILE.
 *
 * @module layer-c-memory/storage/atoms/write-queue/task-executor
 */

const EMFILE_RETRY_DELAY = 100;
const MAX_EMFILE_RETRIES = 5;

/**
 * Detecta error EMFILE
 * @param {Error} error - Error a verificar
 * @returns {boolean} True si es error EMFILE
 */
export function isEMFILE(error) {
  return error.code === 'EMFILE' ||
         error.code === 'ENFILE' ||
         (error.message && error.message.includes('too many open files'));
}

/**
 * Calcula el delay para reintento con backoff exponencial
 * @param {number} backoffMultiplier - Multiplicador actual
 * @returns {number} Delay en ms
 */
export function calculateEMFILEDelay(backoffMultiplier) {
  return EMFILE_RETRY_DELAY * backoffMultiplier;
}

/**
 * Ejecuta una tarea con manejo de errores
 * @param {Object} task - Tarea a ejecutar
 * @param {Function} onEMFILE - Callback para error EMFILE
 * @param {Function} onComplete - Callback al completar
 * @returns {Promise<void>}
 */
export async function executeTask(task, onEMFILE, onComplete) {
  const waitTime = Date.now() - task.addedAt;

  try {
    const result = await task.fn();
    onComplete(null, result, waitTime);
    return result;
  } catch (error) {
    if (isEMFILE(error) && task.retries > 0) {
      onEMFILE(task);
      return;
    }

    onComplete(error, null, waitTime);
    throw error;
  }
}

/**
 * Re-encola una tarea después de error EMFILE
 * @param {Object} task - Tarea fallida
 * @param {Function} enqueue - Función para encolar
 * @param {Function} tryProcess - Función para procesar
 * @param {number} backoffMultiplier - Multiplicador de backoff
 * @returns {number} Nuevo multiplicador de backoff
 */
export function retryAfterEMFILE(task, enqueue, tryProcess, backoffMultiplier) {
  task.retries--;
  const newBackoff = Math.min(backoffMultiplier * 2, 2000);
  const delay = calculateEMFILEDelay(newBackoff);

  setTimeout(() => {
    enqueue(task);
    tryProcess();
  }, delay);

  return newBackoff;
}

export default {
  isEMFILE,
  calculateEMFILEDelay,
  executeTask,
  retryAfterEMFILE
};
