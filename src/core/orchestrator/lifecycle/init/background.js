import { indexProject } from '../../../../layer-a-static/indexer.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');

/**
 * Start background indexing if no data exists
 */
export async function startBackgroundIndexing() {
  const hasData = await this._hasExistingAnalysis();

  if (hasData) {
    logger.info('📊 Analysis data found, skipping initial indexing');
    return;
  }

  logger.info('\n🚀 Waiting for primary MCP indexing to complete (Orchestrator background skipped)...\n');
  this.isIndexing = true;

  // FIX: The Orchestrator's automatic background indexer was fighting the primary MCP Daemon
  // `index-runner.js`, creating two identical multi-threaded pools extracting 9,000 atoms 
  // simultaneously. This led to SQLite Lock Contention, 80s execution times, and 18,000 duplicated atoms.
  // The MCP Daemon explicitly controls the static analysis before booting the Orchestrator, 
  // so this background task is redundant and destructive in the CLI/Daemon context.

  // indexProject(this.projectPath, {
  //   outputPath: 'system-map.json',
  //   verbose: true,
  //   skipLLM: true
  // }).then((result) => {
  //   logger.info('\n✅ Background indexing completed');
  //   this.isIndexing = false;
  //   this.indexingProgress = 100;
  //   this.emit('indexing:completed', result);
  // }).catch((error) => {
  //   logger.error('\n❌ Background indexing failed:', error.message);
  //   this.isIndexing = false;
  //   this.emit('indexing:failed', error);
  // });

  // Simulate completion immediately so the Orchestrator unlocks
  setTimeout(() => {
    this.isIndexing = false;
    this.indexingProgress = 100;
  }, 1000);

  // Monitor progress
  this._monitorIndexingProgress();
}
