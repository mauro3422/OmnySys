import { createLogger } from '../../../utils/logger.js';
import { runCanonicalPromotionReport } from './get-canonical-promotion-report-runner.js';

const logger = createLogger('OmnySys:canonical-promotion');

export async function get_canonical_promotion_report(args, context) {
  logger.info('[Tool] get_canonical_promotion_report()');

  try {
    return await runCanonicalPromotionReport(args, context);
  } catch (error) {
    logger.error(`[Tool] get_canonical_promotion_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_canonical_promotion_report };
