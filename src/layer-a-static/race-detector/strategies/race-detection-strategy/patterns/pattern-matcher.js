/**
 * @fileoverview pattern-matcher.js
 * 
 * High-level pattern matching orchestrator that coordinates between
 * analyzers and the pattern registry to detect specific race conditions.
 * Provides a unified interface for race detection algorithms.
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-matcher
 */

import { PatternRegistry, defaultRegistry } from './pattern-registry.js';
import { SharedStateAnalyzer } from '../analyzers/shared-state-analyzer.js';
import { TimingAnalyzer } from '../analyzers/timing-analyzer.js';
import { LockAnalyzer } from '../analyzers/lock-analyzer.js';

/**
 * Result of a pattern match
 * @typedef {Object} MatchResult
 * @property {boolean} matches - Whether pattern matches
 * @property {string} [type] - Matched pattern type
 * @property {string} [name] - Matched pattern name
 * @property {string} [severity] - Severity level
 * @property {Object} [context] - Additional match context
 */

/**
 * Configuration for pattern matching
 * @typedef {Object} MatcherConfig
 * @property {PatternRegistry} [registry] - Custom pattern registry
 * @property {boolean} [checkTiming=true] - Whether to check timing
 * @property {boolean} [checkLocks=true] - Whether to check lock protection
 * @property {boolean} [checkConcurrency=true] - Whether to verify concurrency
 */

/**
 * Pattern matcher that coordinates analyzers and registry
 */
export class PatternMatcher {
  constructor(config = {}) {
    /** @type {PatternRegistry} */
    this.registry = config.registry || defaultRegistry;
    
    /** @type {SharedStateAnalyzer} */
    this.sharedStateAnalyzer = new SharedStateAnalyzer();
    
    /** @type {TimingAnalyzer} */
    this.timingAnalyzer = new TimingAnalyzer();
    
    /** @type {LockAnalyzer} */
    this.lockAnalyzer = new LockAnalyzer();
    
    /** @type {MatcherConfig} */
    this.config = {
      checkTiming: true,
      checkLocks: true,
      checkConcurrency: true,
      ...config
    };
  }

  /**
   * Match two accesses against all registered patterns
   * 
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @param {Object} [context={}] - Additional context
   * @returns {Array<MatchResult>} - All matching patterns
   */
  match(access1, access2, project, context = {}) {
    const results = [];
    
    // First check: accesses must be to same state
    if (!this._sameStateTarget(access1, access2)) {
      return results;
    }
    
    // Build context from analyzers
    const matchContext = this._buildContext(access1, access2, project, context);
    
    // Check concurrency if enabled
    if (this.config.checkConcurrency && !matchContext.canRunConcurrently) {
      return results;
    }
    
    // Check lock protection if enabled
    if (this.config.checkLocks && matchContext.hasCommonLock) {
      return results;
    }
    
    // Match against all patterns
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
   * 
   * @param {string} type - Pattern type to match
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @param {Object} [context={}] - Additional context
   * @returns {MatchResult} - Match result
   */
  matchType(type, access1, access2, project, context = {}) {
    const pattern = this.registry.get(type);
    
    if (!pattern) {
      return { matches: false };
    }
    
    // Build context
    const matchContext = this._buildContext(access1, access2, project, context);
    
    // Check preconditions
    if (this.config.checkConcurrency && !matchContext.canRunConcurrently) {
      return { matches: false };
    }
    
    if (this.config.checkLocks && matchContext.hasCommonLock) {
      return { matches: false };
    }
    
    // Run matcher
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
   * 
   * @param {Array} accesses - Array of access points
   * @param {Object} project - Project data
   * @param {Object} [options={}] - Matching options
   * @returns {Array<Object>} - Array of race pairs with patterns
   */
  findRaces(accesses, project, options = {}) {
    const races = [];
    const matched = new Set();
    
    for (let i = 0; i < accesses.length; i++) {
      for (let j = i + 1; j < accesses.length; j++) {
        const access1 = accesses[i];
        const access2 = accesses[j];
        
        // Skip if already processed
        const pairKey = `${access1.atom}:${access2.atom}:${access1.type}:${access2.type}`;
        if (matched.has(pairKey)) continue;
        matched.add(pairKey);
        
        // Match patterns
        const matches = this.match(access1, access2, project, options);
        
        if (matches.length > 0) {
          // Use highest severity match
          const bestMatch = matches.sort((a, b) => 
            this._severityRank(b.severity) - this._severityRank(a.severity)
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
   * 
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @returns {Object} - Mitigation analysis
   */
  checkMitigation(access1, access2, project) {
    const atom1 = this._findAtom(access1.atom, project);
    const atom2 = this._findAtom(access2.atom, project);
    
    return this.lockAnalyzer.checkMitigation(
      { accesses: [access1, access2] },
      project
    );
  }

  /**
   * Get suggested mitigation strategies for a race
   * 
   * @param {string} patternType - Type of race pattern
   * @returns {Array<string>} - Mitigation strategies
   */
  getMitigationStrategies(patternType) {
    return this.registry.getMitigationStrategies(patternType);
  }

  /**
   * Build match context from analyzers
   * @private
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} project - Project data
   * @param {Object} userContext - User-provided context
   * @returns {Object} - Combined context
   */
  _buildContext(access1, access2, project, userContext) {
    const context = { ...userContext };
    
    // Timing analysis
    if (this.config.checkTiming) {
      context.canRunConcurrently = this.timingAnalyzer.canRunConcurrently(
        access1, access2, project
      );
      context.sameBusinessFlow = this.timingAnalyzer.sameBusinessFlow(
        access1, access2, project
      );
      context.sameEntryPoint = this.timingAnalyzer.sameEntryPoint(
        access1, access2, project
      );
    }
    
    // Lock analysis
    if (this.config.checkLocks) {
      const atom1 = this._findAtom(access1.atom, project);
      const atom2 = this._findAtom(access2.atom, project);
      
      context.hasCommonLock = this.lockAnalyzer.haveCommonLock(
        access1, access2, atom1, atom2, project
      );
      context.lockProtection1 = this.lockAnalyzer.getLockProtection(
        access1, atom1, project
      );
      context.lockProtection2 = this.lockAnalyzer.getLockProtection(
        access2, atom2, project
      );
    }
    
    return context;
  }

  /**
   * Check if two accesses target the same state
   * @private
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @returns {boolean}
   */
  _sameStateTarget(access1, access2) {
    // Compare by state key if available
    if (access1.stateKey && access2.stateKey) {
      return access1.stateKey === access2.stateKey;
    }
    
    // Compare by name and scope
    return access1.name === access2.name && 
           access1.scope === access2.scope;
  }

  /**
   * Find atom by ID
   * @private
   * @param {string} atomId - Atom identifier
   * @param {Object} project - Project data
   * @returns {Object|null}
   */
  _findAtom(atomId, project) {
    for (const module of project.modules || []) {
      for (const molecule of module.files || []) {
        for (const atom of molecule.atoms || []) {
          if (atom.id === atomId) {
            return atom;
          }
        }
      }
    }
    return null;
  }

  /**
   * Convert severity to numeric rank
   * @private
   * @param {string} severity - Severity string
   * @returns {number}
   */
  _severityRank(severity) {
    const ranks = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    return ranks[severity] || 0;
  }
}

export default PatternMatcher;
