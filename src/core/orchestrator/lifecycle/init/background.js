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

  logger.info('\n🚀 Starting background indexing...\n');
  this.isIndexing = true;

  // Start indexing in background (don't await) — LLM desactivado, skipLLM siempre true
  indexProject(this.projectPath, {
    outputPath: 'system-map.json',
    verbose: true,
    skipLLM: true
  }).then((result) => {
    logger.info('\n✅ Background indexing completed');
    this.isIndexing = false;
    this.indexingProgress = 100;
    this.emit('indexing:completed', result);
  }).catch((error) => {
    logger.error('\n❌ Background indexing failed:', error.message);
    this.isIndexing = false;
    this.emit('indexing:failed', error);
  });

  // Monitor progress
  this._monitorIndexingProgress();
}
