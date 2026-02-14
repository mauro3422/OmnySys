/**
 * @fileoverview Down Command
 * 
 * Stop all services
 * 
 * @module cli/commands/down
 */

import { log } from '../utils/logger.js';
import { stopAll } from '../handlers/process-manager.js';

export const aliases = ['stop', 'down'];

export async function execute() {
  log('Deteniendo OmnySys...', 'loading');
  stopAll();
  log('OmnySys detenido', 'success');
}
