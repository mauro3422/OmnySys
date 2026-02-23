/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:status');



export async function get_server_status(args, context) {
  const { orchestrator, cache, projectPath, server } = context;
  
  logger.info(`[Tool] get_server_status()`);

  // Siempre disponible: información básica del sistema
  const status = {
    initialized: server?.initialized || false,
    initializing: !!server && !server.initialized,
    project: projectPath,
    timestamp: new Date().toISOString()
  };

  // Información del orchestrator (si está disponible)
  if (orchestrator) {
    try {
      status.orchestrator = orchestrator.getStatus ? orchestrator.getStatus() : { status: 'initializing' };
    } catch (e) {
      status.orchestrator = { status: 'error', message: e.message };
    }
  } else {
    status.orchestrator = { status: 'not_ready', message: 'Orchestrator is initializing' };
  }

  // Metadata del proyecto (desde disco, siempre disponible)
  try {
    const metadata = await getProjectMetadata(projectPath);
    status.metadata = {
      totalFiles: metadata?.stats?.totalFiles || metadata?.totalFiles || 0,
      totalFunctions: metadata?.stats?.totalAtoms || metadata?.totalFunctions || 0,
      lastAnalyzed: metadata?.system_map_metadata?.analyzedAt || metadata?.indexedAt || null
    };
  } catch (e) {
    status.metadata = { error: 'Metadata not available', message: e.message };
  }

  // Cache stats (si está disponible)
  if (cache) {
    try {
      status.cache = cache.getStats ? cache.getStats() : { status: 'initializing' };
    } catch (e) {
      status.cache = { status: 'error', message: e.message };
    }
  } else {
    status.cache = { status: 'not_ready', message: 'Cache is initializing' };
  }

  return status;
}
