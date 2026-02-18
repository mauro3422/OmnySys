import { log } from '../utils/logger.js';
import { stopAll } from '../handlers/process-manager.js';

export const aliases = ['stop', 'down'];

export async function downLogic(options = {}) {
  const { silent = false } = options;

  try {
    stopAll();
    return {
      success: true,
      exitCode: 0,
      message: 'All services stopped'
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      error: error.message
    };
  }
}

export async function execute() {
  log('Deteniendo OmnySys...', 'loading');
  const result = await downLogic();
  
  if (result.success) {
    log('OmnySys detenido', 'success');
  } else {
    log(`Error: ${result.error}`, 'error');
  }
}
