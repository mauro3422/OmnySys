import { createLogger } from '../../../utils/logger.js';
import { clearWatcherIssueFamily } from '../watcher-issue-persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:integrity');

export async function clearIntegrityIssues(rootPath, filePath) {
  try {
    await clearWatcherIssueFamily(rootPath, filePath, 'sem_data_flow_');
  } catch (error) {
    logger.debug(`[INTEGRITY CLEAR SKIP] ${filePath}: ${error.message}`);
  }
}
