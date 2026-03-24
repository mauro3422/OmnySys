import { statsPool } from '../../../../../shared/utils/stats-pool.js';
import { IssueManager } from '../issue-manager/index.js';

/**
 * @fileoverview Base validator for consistency validation families.
 */
export class BaseConsistencyValidator {
  constructor(cache, issueManager, statsModuleName) {
    this.cache = cache;
    this.issues = issueManager || new IssueManager();
    this.statsModuleName = statsModuleName;
  }

  getConsistencyStats() {
    return statsPool.getModuleStats(this.statsModuleName);
  }
}

export default BaseConsistencyValidator;
