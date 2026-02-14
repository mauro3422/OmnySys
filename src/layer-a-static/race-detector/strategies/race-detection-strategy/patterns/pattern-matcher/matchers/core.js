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
import { buildContext } from '../utils/context.js';
import { findAtom, severityRank } from '../utils/helpers.js';

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
    
    if (this.config.checkConcurrency && !matchContext.canRunConcurrently) {
      return results;
    }
    
    if (this.config.checkLocks && matchContext.hasCommonLock) {
      return results;
    }
    
    const patterns = this.registry.getAllPatterns();
    
    for (const pattern of patterns) {
      try {
        if (pattern.matcher(access1, access2, matchContext)) {
          results.push({
            matches: true,
            type: pattern.type,
            name: pattern.name,
            severity: pattern.severity,
            context: matchContext
          });
        }
      } catch (err) {
        // Silently ignore matcher errors
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
    
    if (this.config.checkConcurrency && !matchContext.canRunConcurrently) {
      return { matches: false };
    }
    
    if (this.config.checkLocks && matchContext.hasCommonLock) {
      return { matches: false };
    }
    
    try {
      if (pattern.matcher(access1, access2, matchContext)) {
        return {
          matches: true,
          type: pattern.type,
          name: pattern.name,
          severity: pattern.severity,
          context: matchContext
        };
      }
    } catch (err) {
      // Ignore matcher errors
    }
    
    return { matches: false };
  }

  /**
   * Find all race pairs in a set of accesses
   */
  findRaces(accesses, project, options = {}) {
    const races = [];
    const matched = new Set();
    
    for (let i = 0; i < accesses.length; i++) {
      for (let j = i + 1; j < accesses.length; j++) {
        const access1 = accesses[i];
        const access2 = accesses[j];
        
        const pairKey = `${access1.atom}:${access2.atom}:${access1.type}:${access2.type}`;
        if (matched.has(pairKey)) continue;
        matched.add(pairKey);
        
        const matches = this.match(access1, access2, project, options);
        
        if (matches.length > 0) {
          const bestMatch = matches.sort((a, b) => 
            severityRank(b.severity) - severityRank(a.severity)
          )[0];
          
          races.push({
            access1,
            access2,
            pattern: bestMatch,
            allMatches: matches
          });
        }
      }
    }
    
    return races;
  }

  /**
   * Check if a race is properly mitigated
   */
  checkMitigation(access1, access2, project) {
    const atom1 = findAtom(access1.atom, project);
    const atom2 = findAtom(access2.atom, project);
    
    return this.lockAnalyzer.checkMitigation(
      { accesses: [access1, access2] },
      project
    );
  }

  /**
   * Get suggested mitigation strategies for a race
   */
  getMitigationStrategies(patternType) {
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
