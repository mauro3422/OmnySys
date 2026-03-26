/**
 * @fileoverview core.js
 * 
 * Core pattern matching logic
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/matchers/core
 */

import { PatternRegistry, defaultRegistry } from '../../pattern-registry.js';
import { SharedStateAnalyzer } from '../../analyzers/shared-state-analyzer.js';
import { TimingAnalyzer } from '../../analyzers/timing-analyzer.js';
import { LockAnalyzer } from '../../analyzers/lock-analyzer.js';
import { checkMitigation as checkLockMitigation } from '../../../analyzers/lock/analysis/mitigation.js';
import { buildContext } from '../utils/context.js';
import { findAtom } from '../utils/helpers.js';
import {
  buildRaceRecord,
  canEvaluateMatch,
  executePatternMatcher,
  forEachUniqueAccessPair
} from '../utils/matcher-helpers.js';

function mapMitigationType(type) {
  switch (type) {
    case 'common_lock':
      return 'shared-lock';
    case 'atomic_operations':
      return 'atomics';
    case 'transaction_isolation':
      return 'transaction';
    default:
      return type || null;
  }
}

/**
 * Pattern matcher that coordinates analyzers and registry
 */
export class PatternMatcher {
  constructor(config = {}) {
    this.registry = config.registry || defaultRegistry;
    this.sharedStateAnalyzer = new SharedStateAnalyzer();
    this.timingAnalyzer = new TimingAnalyzer();
    this.lockAnalyzer = new LockAnalyzer();
    
    this.config = {
      checkTiming: true,
      checkLocks: true,
      checkConcurrency: true,
      ...config
    };
  }

  /**
   * Match two accesses against all registered patterns
   */
  match(access1, access2, project, context = {}) {
    const results = [];

    if (!this._sameStateTarget(access1, access2)) {
      return results;
    }

    const matchContext = buildContext(
      access1, access2, project, context,
      this.timingAnalyzer, this.lockAnalyzer, this.config
    );

    if (!canEvaluateMatch(this.config, matchContext)) {
      return results;
    }

    const patterns = this.registry.getAllPatterns();

    for (const pattern of patterns) {
      const match = executePatternMatcher(pattern, access1, access2, matchContext);

      if (match) {
        results.push(match);
      }
    }

    return results;
  }

  /**
   * Match with a specific pattern type
   */
  matchType(type, access1, access2, project, context = {}) {
    const pattern = this.registry.get(type);

    if (!pattern) {
      return { matches: false };
    }

    const matchContext = buildContext(
      access1, access2, project, context,
      this.timingAnalyzer, this.lockAnalyzer, this.config
    );

    if (!canEvaluateMatch(this.config, matchContext)) {
      return { matches: false };
    }

    const match = executePatternMatcher(pattern, access1, access2, matchContext);

    if (match) {
      return match;
    }

    return { matches: false };
  }

  /**
   * Find all race pairs in a set of accesses
   */
  findRaces(accesses, project, options = {}) {
    const races = [];

    forEachUniqueAccessPair(accesses, (access1, access2) => {
        const matches = this.match(access1, access2, project, options);

        if (matches.length > 0) {
          races.push(buildRaceRecord(access1, access2, matches));
        }
    });

    return races;
  }

  /**
   * Check if a race is properly mitigated
   */
  checkMitigation(access1, access2, project) {
    if (!access1 || !access2) {
      return { mitigated: false, mechanism: null };
    }

    const mitigation = checkLockMitigation(
      { accesses: [access1, access2] },
      project,
      {
        haveCommonLock: (a1, a2, atom1, atom2, projectContext) => this.lockAnalyzer.hasCommonLock(a1, a2),
        getLockProtection: (access, atom, projectContext) => this.lockAnalyzer._getLockProtection(access, projectContext || project),
        findAtomForAccess: (access, projectContext) => findAtom(access.atom, projectContext || project)
      }
    );

    if (mitigation?.hasMitigation) {
      return { mitigated: true, mechanism: mapMitigationType(mitigation.type) };
    }

    if (project?.lockMechanisms?.length > 0) {
      return { mitigated: true, mechanism: 'project-lock' };
    }

    return { mitigated: false, mechanism: null };
  }

  /**
   * Get suggested mitigation strategies for a race
   */
  resolveMitigationStrategies(patternType) {
    return this.registry.getMitigationStrategies(patternType);
  }

  _sameStateTarget(access1, access2) {
    if (access1.stateKey && access2.stateKey) {
      return access1.stateKey === access2.stateKey;
    }
    
    return access1.name === access2.name && 
           access1.scope === access2.scope;
  }
}

export default PatternMatcher;
