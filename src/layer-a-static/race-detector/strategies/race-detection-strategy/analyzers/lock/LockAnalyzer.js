/**
 * @fileoverview LockAnalyzer - Analyzes synchronization patterns and lock usage
 * 
 * Determines if shared state accesses are properly protected against race conditions.
 * Detects missing locks, improper lock ordering, and lock coverage gaps.
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock
 * @version 0.9.4 - Modularizado
 */

import {
  detectExplicitLock,
  detectMonitorPattern,
  detectAtomicOperation,
  detectTransactionalContext
} from './detectors/index.js';

import {
  analyzeLockCoverage,
  findPotentialDeadlocks,
  checkMitigation
} from './analysis/index.js';

import { determineScope } from './utils/index.js';

/**
 * Analyzer for lock and synchronization patterns
 */
export class LockAnalyzer {
  constructor() {
    this._knownLockTypes = new Set([
      'mutex', 'semaphore', 'rwlock', 'spinlock',
      'synchronized', 'atomic', 'concurrent',
      'Lock', 'Mutex', 'Semaphore'
    ]);
  }

  /**
   * Check if an access is protected by a lock
   */
  getLockProtection(access, atom, project) {
    if (!atom?.code) return null;

    const lines = atom.code.split('\n');
    const accessLine = access.line || 0;

    const contextStart = Math.max(0, accessLine - 10);
    const contextEnd = Math.min(lines.length, accessLine + 2);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    return (
      detectExplicitLock(context, access, determineScope) ||
      detectMonitorPattern(context, access) ||
      detectAtomicOperation(context, access) ||
      detectTransactionalContext(context, access)
    );
  }

  /**
   * Check if two accesses are protected by the same lock
   */
  haveCommonLock(access1, access2, atom1, atom2, project) {
    const lock1 = this.getLockProtection(access1, atom1, project);
    const lock2 = this.getLockProtection(access2, atom2, project);

    if (!lock1 || !lock2) return false;

    if (lock1.lockName && lock1.lockName === lock2.lockName) {
      return true;
    }

    if (lock1.type === 'monitor' && lock2.type === 'monitor') {
      return lock1.target === lock2.target;
    }

    if (lock1.type === 'transaction' && lock2.type === 'transaction') {
      return true;
    }

    return false;
  }

  /**
   * Analyze lock coverage for a set of accesses
   */
  analyzeLockCoverage(accesses, project) {
    return analyzeLockCoverage(
      accesses,
      project,
      (access, atom) => this.getLockProtection(access, atom, project),
      (access) => this._findAtomForAccess(access, project)
    );
  }

  /**
   * Find potential deadlocks in lock ordering
   */
  findPotentialDeadlocks(accesses) {
    return findPotentialDeadlocks(accesses);
  }

  /**
   * Check if race is mitigated by locking
   */
  checkMitigation(race, project) {
    return checkMitigation(race, project, {
      haveCommonLock: (a1, a2, atom1, atom2) => this.haveCommonLock(a1, a2, atom1, atom2, project),
      getLockProtection: (access, atom) => this.getLockProtection(access, atom, project),
      findAtomForAccess: (access) => this._findAtomForAccess(access, project)
    });
  }

  /**
   * Find atom for an access point
   * @private
   */
  _findAtomForAccess(access, project) {
    for (const module of project.modules || []) {
      for (const molecule of module.files || []) {
        for (const atom of molecule.atoms || []) {
          if (atom.id === access.atom) {
            return atom;
          }
        }
      }
    }
    return null;
  }
}

export default LockAnalyzer;
