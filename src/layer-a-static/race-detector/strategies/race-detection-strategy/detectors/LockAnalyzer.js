/**
 * @fileoverview LockAnalyzer.js
 * 
 * Analyzes lock/synchronization patterns for race detection.
 * 
 * @module race-detector/strategies/race-detection-strategy/detectors/LockAnalyzer
 */

/**
 * Analyzes lock and synchronization patterns
 */
export class LockAnalyzer {
  constructor() {
    this.lockPatterns = [
      { type: 'mutex', pattern: /mutex|lock|synchronized/i },
      { type: 'semaphore', pattern: /semaphore|acquire|release/i },
      { type: 'atomic', pattern: /atomic|compareAndSwap|CAS/i },
      { type: 'transaction', pattern: /transaction|BEGIN|COMMIT/i }
    ];
  }

  /**
   * Check if an access is protected by a lock
   * @param {Object} access - Access point to check
   * @param {Object} atom - Atom containing the access
   * @param {Object} project - Project data
   * @returns {Object|null} - Lock info if protected
   */
  getLockProtection(access, atom, project) {
    if (!atom) return null;

    if (atom.locks) {
      const relevantLock = atom.locks.find(lock => 
        lock.protectedVars?.includes(access.variable) ||
        lock.scope?.includes(access.line)
      );
      
      if (relevantLock) {
        return {
          type: relevantLock.type,
          name: relevantLock.name,
          granularity: relevantLock.granularity || 'unknown'
        };
      }
    }

    const code = access.code || atom.code;
    if (code) {
      for (const { type, pattern } of this.lockPatterns) {
        if (pattern.test(code)) {
          return { type, implicit: true };
        }
      }
    }

    return null;
  }

  /**
   * Check if two accesses are protected by the same lock
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @param {Object} atom1 - First atom
   * @param {Object} atom2 - Second atom
   * @param {Object} project - Project data
   * @returns {boolean} - True if same lock protects both
   */
  haveCommonLock(access1, access2, atom1, atom2, project) {
    const lock1 = this.getLockProtection(access1, atom1, project);
    const lock2 = this.getLockProtection(access2, atom2, project);

    if (!lock1 || !lock2) return false;

    if (lock1.type === lock2.type && lock1.name && lock1.name === lock2.name) {
      return true;
    }

    if (lock1.variable && lock1.variable === lock2.variable) {
      return true;
    }

    return false;
  }

  /**
   * Check if race is mitigated by locking
   * @param {Object} race - Race condition object
   * @param {Object} project - Project data
   * @returns {Object} - Mitigation analysis
   */
  checkMitigation(race, project) {
    const [access1, access2] = race.accesses;
    const atom1 = this.findAtom(access1.atom, project);
    const atom2 = this.findAtom(access2.atom, project);

    const lock1 = this.getLockProtection(access1, atom1, project);
    const lock2 = this.getLockProtection(access2, atom2, project);

    const mitigation = {
      isMitigated: false,
      mitigationType: null,
      confidence: 'low',
      details: []
    };

    if (lock1 && lock2) {
      if (this.haveCommonLock(access1, access2, atom1, atom2, project)) {
        mitigation.isMitigated = true;
        mitigation.mitigationType = 'common-lock';
        mitigation.confidence = 'high';
        mitigation.details.push(`Both protected by ${lock1.type}:${lock1.name}`);
      } else {
        mitigation.details.push('Different locks - potential ordering issue');
      }
    } else if (lock1 || lock2) {
      mitigation.details.push('Only one access protected - partial mitigation');
    }

    return mitigation;
  }

  /**
   * Find atom by ID
   * @private
   */
  findAtom(atomId, project) {
    const modules = project.modules || {};
    for (const module of Object.values(modules)) {
      const atom = module.atoms?.find(a => a.id === atomId);
      if (atom) return atom;
    }
    return null;
  }
}

export default LockAnalyzer;
