/**
 * Tool: get_server_status
 * Returns the complete status of the OmnySys server
 */

import { getProjectMetadata } from '../../../layer-a-static/query/index.js';

export async function get_server_status(args, context) {
  const { orchestrator, cache, projectPath } = context;
  
  console.error(`[Tool] get_server_status()`);

  const orchestratorStatus = orchestrator.getStatus();
  const metadata = await getProjectMetadata(projectPath);

  return {
    initialized: true,
    orchestrator: orchestratorStatus,
    metadata: {
      totalFiles: metadata?.metadata?.totalFiles || 0,
      totalFunctions: metadata?.metadata?.totalFunctions || 0
    },
    cache: cache.getCacheStats()
  };
}
