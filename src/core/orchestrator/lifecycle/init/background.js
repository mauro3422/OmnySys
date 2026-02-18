import { indexProject } from '../../../../layer-a-static/indexer.js';
import { LLMService } from '../../../../services/llm-service.js';
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

  // Check LLM availability via service
  let llmAvailable = false;
  if (this.options.autoStartLLM) {
    const service = await LLMService.getInstance();
    llmAvailable = await service.waitForAvailable(10000);
  }

  // Start indexing in background (don't await)
  indexProject(this.projectPath, {
    outputPath: 'system-map.json',
    verbose: true,
    skipLLM: !llmAvailable
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
