/**
 * @fileoverview context.js
 * 
 * Context building utilities
 * 
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/utils/context
 */

import { findAtom } from './helpers.js';

/**
 * Build match context from analyzers
 */
export function buildContext(access1, access2, project, userContext, 
                             timingAnalyzer, lockAnalyzer, config) {
  const context = { ...userContext };
  
  // Timing analysis
  if (config.checkTiming) {
    context.canRunConcurrently = timingAnalyzer.canRunConcurrently(
      access1, access2, project
    );
    context.sameBusinessFlow = timingAnalyzer.sameBusinessFlow(
      access1, access2, project
    );
    context.sameEntryPoint = timingAnalyzer.sameEntryPoint(
      access1, access2, project
    );
  }
  
  // Lock analysis
  if (config.checkLocks) {
    const atom1 = findAtom(access1.atom, project);
    const atom2 = findAtom(access2.atom, project);
    
    context.hasCommonLock = lockAnalyzer.haveCommonLock(
      access1, access2, atom1, atom2, project
    );
    context.lockProtection1 = lockAnalyzer.getLockProtection(
      access1, atom1, project
    );
    context.lockProtection2 = lockAnalyzer.getLockProtection(
      access2, atom2, project
    );
  }
  
  return context;
}
