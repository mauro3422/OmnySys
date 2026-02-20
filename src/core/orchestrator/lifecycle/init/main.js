import path from 'path';
import { StateManager } from '../../../state-manager.js';
import { AnalysisWorker } from '../../../worker/AnalysisWorker.js';
import { getCacheManager } from '#core/cache/singleton.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');

/**
 * Initialize the orchestrator
 */
export async function initialize() {
  logger.info('\n🔧 Initializing Orchestrator...\n');

  // Initialize cache - use external cache if provided, otherwise create new
  if (this.options.cache) {
    this.cache = this.options.cache;
    logger.info('  ✅ Using shared cache from server');
  } else {
    this.cache = await getCacheManager(this.projectPath);
    logger.info('  ✅ Cache initialized (singleton)');
  }

  // Initialize state manager
  this.stateManager = new StateManager(
    path.join(this.OmnySysDataPath, 'orchestrator-state.json')
  );

  // Initialize worker
  this.worker = new AnalysisWorker(this.projectPath, {
    onProgress: (job, progress) => this._onJobProgress(job, progress),
    onComplete: (job, result) => this._onJobComplete(job, result),
    onError: (job, error) => this._onJobError(job, error)
  });
  await this.worker.initialize();
  logger.info('  ✅ Worker initialized');

  // Initialize optional components
  if (this.options.enableFileWatcher) {
    await this._initializeFileWatcher();
  }

  if (this.options.enableWebSocket) {
    await this._initializeWebSocket();
  }

  // Load existing state
  await this._loadState();

  // Derivar insights estáticamente desde átomos (sin LLM)
  this._deriveStaticInsights().then(() => {
    logger.info('✅ Static insights derived from atoms');
  }).catch(err => {
    logger.warn('⚠️  Static insights derivation failed:', err.message);
  });

  logger.info('✅ Orchestrator initialized\n');
}
