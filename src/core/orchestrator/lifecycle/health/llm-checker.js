import { LLMService } from '../../../services/llm-service.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');

/**
 * Start periodic LLM health checker
 * Ahora simplificado usando LLMService
 */
export function _startLLMHealthChecker() {
  logger.info('🔍 [HEALTH-CHECK] Starting...');
  
  if (this._llmHealthRunning) {
    logger.info('⏳ Health checker already running');
    return;
  }
  
  this._llmHealthRunning = true;
  let attempts = 0;
  const maxAttempts = 60;
  
  const checkLLM = async () => {
    if (!this._llmHealthRunning) return;
    
    try {
      logger.info(`🔍 [HEALTH-CHECK] Attempt ${attempts + 1}/${maxAttempts}`);
      
      const service = await LLMService.getInstance();
      const isAvailable = service.isAvailable();
      
      if (isAvailable) {
        logger.info('✅ LLM server is available (via LLMService)');
        this._llmHealthRunning = false;
        
        // Trigger analysis if not already done
        if (!this._llmAnalysisTriggered) {
          logger.info('🤖 Triggering LLM analysis queue...');
          this._llmAnalysisTriggered = true;
          this._analyzeComplexFilesWithLLM().then(() => {
            logger.info("✅ LLM analysis queue completed");
          }).catch(err => {
            logger.error("❌ LLM analysis failed:", err.message);
            this._llmAnalysisTriggered = false;
          });
        }
        return;
      }
      
      // Try to force health check
      await service.checkHealth();
      
      attempts++;
      if (attempts % 6 === 0) {
        logger.info(`⏳ Still waiting for LLM server... (${attempts}/${maxAttempts})`);
      }
      
      if (attempts >= maxAttempts) {
        logger.warn('⚠️  LLM health checker stopped after 5 minutes');
        this._llmHealthRunning = false;
        return;
      }
      
      // Schedule next check
      setTimeout(checkLLM, 5000);
    } catch (error) {
      logger.warn('⚠️  LLM health check error:', error.message);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkLLM, 5000);
      } else {
        this._llmHealthRunning = false;
      }
    }
  };
  
  // Start first check immediately
  setTimeout(checkLLM, 0);
}
