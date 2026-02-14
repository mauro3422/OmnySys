/**
 * @fileoverview PatternDetectors.js
 * 
 * Individual pattern detection functions.
 * 
 * @module race-detector/patterns/PatternDetectors
 */

import { getCodeContext } from '../utils/code-utils.js';

/**
 * Singleton Pattern: if (!instance) { instance = create(); }
 */
export function isSingletonPattern(race) {
  if (race.type !== 'IE' && race.type !== 'WW') return false;

  const accesses = race.accesses;
  
  for (const access of accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const singletonIndicators = [
      /if\s*\(\s*!\w+\s*\)\s*\{[^}]*=\s*(?:await\s+)?create/i,
      /if\s*\(\s*\w+\s*===?\s*(?:null|undefined)\s*\)\s*\{[^}]*=/i,
      /if\s*\(\s*typeof\s+\w+\s*===?\s*['"]undefined['"]\s*\)\s*\{[^}]*=/i,
      /\w+\s*\|\|\s*\(\s*\w+\s*=\s*(?:await\s+)?/i
    ];

    if (singletonIndicators.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}

/**
 * Counter Pattern: count++, total += value
 */
export function isCounterPattern(race) {
  if (race.type !== 'WW') return false;

  for (const access of race.accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const counterIndicators = [
      /\w+\+\+/,
      /\+\+\w+/,
      /\w+\s*\+=\s*\d+/,
      /\w+\s*=\s*\w+\s*[-+]\s*\d+/,
      /counter|count|total|sum|index/i
    ];

    if (counterIndicators.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}

/**
 * Array Pattern: push, pop, splice
 */
export function isArrayPattern(race) {
  if (race.type !== 'WW' && race.type !== 'RW') return false;

  for (const access of race.accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const arrayIndicators = [
      /\.push\s*\(/,
      /\.pop\s*\(/,
      /\.shift\s*\(/,
      /\.unshift\s*\(/,
      /\.splice\s*\(/,
      /\.sort\s*\(/,
      /\.reverse\s*\(/,
      /\[\s*\w+\s*\]\s*=\s*/
    ];

    if (arrayIndicators.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}

/**
 * Cache Pattern: cache[key] = value
 */
export function isCachePattern(race) {
  const cacheIndicators = ['cache', 'Cache', 'memo', 'Memo', 'store', 'Store'];
  
  if (cacheIndicators.some(ind => race.stateKey.includes(ind))) {
    return true;
  }

  for (const access of race.accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const cachePatterns = [
      /cache\[['"]/i,
      /memo\[['"]/i,
      /store\[['"]/i,
      /getOrSet/i,
      /getFromCache/i
    ];

    if (cachePatterns.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}

/**
 * Lazy Initialization Pattern
 */
export function isLazyInitPattern(race) {
  if (race.type !== 'IE') return false;

  for (const access of race.accesses) {
    if (access.type === 'initialization' || access.isLazy) {
      return true;
    }
  }

  return false;
}

/**
 * Event Pattern: on('event', handler)
 */
export function isEventPattern(race) {
  if (race.type !== 'EH' && race.type !== 'OTHER') return false;

  for (const access of race.accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const eventIndicators = [
      /\.on\s*\(\s*['"]/,
      /\.once\s*\(\s*['"]/,
      /\.emit\s*\(/,
      /addEventListener/,
      /EventEmitter/,
      /dispatchEvent/
    ];

    if (eventIndicators.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}

/**
 * Database Update Pattern
 */
export function isDbUpdatePattern(race) {
  const dbIndicators = ['database', 'db.', 'query', 'update', 'insert', 'delete'];
  
  if (dbIndicators.some(ind => race.stateKey.includes(ind))) {
    return true;
  }

  for (const access of race.accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const dbPatterns = [
      /db\.\w+\s*\(/,
      /database\.\w+\s*\(/,
      /\.update\s*\(/,
      /\.insert\s*\(/,
      /\.delete\s*\(/,
      /UPDATE\s+\w+/i,
      /INSERT\s+INTO/i
    ];

    if (dbPatterns.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}

/**
 * File Write Pattern
 */
export function isFileWritePattern(race) {
  if (race.stateKey.startsWith('file:')) return true;

  for (const access of race.accesses) {
    const code = getCodeContext(access);
    if (!code) continue;

    const filePatterns = [
      /fs\.write/,
      /fs\.append/,
      /writeFile/,
      /appendFile/,
      /createWriteStream/
    ];

    if (filePatterns.some(pattern => pattern.test(code))) {
      return true;
    }
  }

  return false;
}
