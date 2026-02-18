import path from 'path';
import { StateManager } from '../../../state-manager.js';
import { AnalysisWorker } from '../../../worker/AnalysisWorker.js';
import { getCacheManager } from '#core/cache/singleton.js';
import { loadAIConfig } from '../../../../ai/llm-client.js';
import { LLMService } from '../../../../services/llm-service.js';
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

  // Load AI config
  this.aiConfig = await loadAIConfig();
  this.maxConcurrentAnalyses = this.aiConfig?.performance?.maxConcurrentAnalyses || 2;
  
  // Initialize LLMService (singleton)
  try {
    await LLMService.getInstance();
    logger.info('  ✅ LLMService initialized');
  } catch (err) {
    logger.warn('⚠️  LLMService not ready yet:', err.message);
  }

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

  // Start LLM availability monitoring
  this._startLLMHealthChecker();

  // Analyze complex files with LLM based on Layer A metadata
  // IMPORTANT: set flag BEFORE calling to prevent health-checker from double-triggering
  this._llmAnalysisTriggered = true;
  this._analyzeComplexFilesWithLLM().then(() => {
    logger.info("✅ LLM analysis queue ready");
  }).catch(err => {
    logger.error("❌ LLM analysis setup failed:", err.message);
    // Reset flag so health-checker can retry if the analysis failed
    this._llmAnalysisTriggered = false;
  });

  logger.info('✅ Orchestrator initialized\n');
}
