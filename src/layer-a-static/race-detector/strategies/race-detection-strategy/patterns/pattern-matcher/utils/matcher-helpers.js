/**
 * @fileoverview matcher-helpers.js
 *
 * Pure helpers for the pattern matcher orchestration layer.
 *
 * @module race-detector/strategies/race-detection-strategy/patterns/pattern-matcher/utils/matcher-helpers
 */

import { severityRank } from './helpers.js';

export function canEvaluateMatch(config, matchContext) {
  if (config.checkConcurrency && !matchContext.canRunConcurrently) {
    return false;
  }

  if (config.checkLocks && matchContext.hasCommonLock) {
    return false;
  }

  return true;
}

export function buildPatternMatch(pattern, matchContext) {
  return {
    matches: true,
    type: pattern.type,
    name: pattern.name,
    severity: pattern.severity,
    context: matchContext
  };
}

export function executePatternMatcher(pattern, access1, access2, matchContext) {
  try {
    if (pattern.matcher(access1, access2, matchContext)) {
      return buildPatternMatch(pattern, matchContext);
    }
  } catch (err) {
    // Silently ignore matcher errors
  }

  return null;
}

export function getPairKey(access1, access2) {
  return `${access1.atom}:${access2.atom}:${access1.type}:${access2.type}`;
}

export function forEachUniqueAccessPair(accesses, visitor) {
  const matched = new Set();

  for (let i = 0; i < accesses.length; i++) {
    for (let j = i + 1; j < accesses.length; j++) {
      const access1 = accesses[i];
      const access2 = accesses[j];
      const pairKey = getPairKey(access1, access2);

      if (matched.has(pairKey)) {
        continue;
      }

      matched.add(pairKey);
      visitor(access1, access2);
    }
  }
}

export function findBestMatch(matches) {
  let bestMatch = null;

  for (const match of matches) {
    if (!bestMatch || severityRank(match.severity) > severityRank(bestMatch.severity)) {
      bestMatch = match;
    }
  }

  return bestMatch;
}

export function buildRaceRecord(access1, access2, matches) {
  return {
    access1,
    access2,
    pattern: findBestMatch(matches),
    allMatches: matches
  };
}
