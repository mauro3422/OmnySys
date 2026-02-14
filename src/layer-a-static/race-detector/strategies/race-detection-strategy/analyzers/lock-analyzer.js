/**
 * @fileoverview lock-analyzer.js
 * 
 * Analyzes synchronization patterns and lock usage to determine if
 * shared state accesses are properly protected against race conditions.
 * Detects missing locks, improper lock ordering, and lock coverage gaps.
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/lock-analyzer
 */

/**
 * Represents a synchronization mechanism (lock, mutex, semaphore)
 * @typedef {Object} LockInfo
 * @property {string} type - Lock type ('mutex', 'semaphore', 'monitor', 'atomic')
 * @property {string} target - What the lock protects
 * @property {string} scope - Lock scope ('local', 'module', 'global')
 * @property {number} line - Line number where lock is acquired
 * @property {number} column - Column number where lock is acquired
 */

/**
 * Analyzer for lock and synchronization patterns
 */
export class LockAnalyzer {
  constructor() {
    /** @type {Set<string>} */
    this._knownLockTypes = new Set([
      'mutex', 'semaphore', 'rwlock', 'spinlock',
      'synchronized', 'atomic', 'concurrent',
      'Lock', 'Mutex', 'Semaphore'
    ]);
  }

  /**
   * Check if an access is protected by a lock
   * 
   * @param {Object} access - Access point to check
   * @param {Object} atom - Atom containing the access
   * @param {Object} project - Project data
   * @returns {LockInfo|null} - Lock info if protected, null otherwise
   */
  getLockProtection(access, atom, project) {
    if (!atom?.code) return null;

    const lines = atom.code.split('\n');
    const accessLine = access.line || 0;
    
    // Check surrounding lines for lock acquisition
    const contextStart = Math.max(0, accessLine - 10);
    const contextEnd = Math.min(lines.length, accessLine + 2);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    // Check for various lock patterns
    return (
      this._checkExplicitLock(context, access) ||
      this._checkMonitorPattern(context, access) ||
      this._checkAtomicOperation(context, access) ||
      this._checkTransactionalContext(context, access)
    );
  }

  /**
   * Check for explicit lock/unlock patterns
   * @private
   * @param {string} context - Code context
   * @param {Object} access - Access point
   * @returns {LockInfo|null}
   */
  _checkExplicitLock(context, access) {
    // Pattern: lock.acquire(), mutex.lock(), etc.
    const lockPattern = /(\w+)(?:\.(?:acquire|lock|enter)\s*\(|\s*=\s*new\s*(?:Lock|Mutex))/i;
    const match = context.match(lockPattern);
    
    if (match) {
      const lockName = match[1];
      
      // Check if lock is released after access
      const hasRelease = context.includes(`${lockName}.release`) ||
                         context.includes(`${lockName}.unlock`) ||
                         context.includes(`${lockName}.exit`);
      
      return {
        type: 'explicit',
        target: access.name || 'unknown',
        scope: this._determineScope(lockName, context),
        line: access.line,
        column: access.column,
        lockName,
        hasRelease
      };
    }
    
    return null;
  }

  /**
   * Check for monitor/synchronized patterns
   * @private
   * @param {string} context - Code context
   * @param {Object} access - Access point
   * @returns {LockInfo|null}
   */
  _checkMonitorPattern(context, access) {
    // Pattern: synchronized(obj) { ... }, withLock { ... }
    const monitorPattern = /(?:synchronized|withLock|monitor)\s*(?:\(|\{)/i;
    
    if (monitorPattern.test(context)) {
      return {
        type: 'monitor',
        target: access.name || 'unknown',
        scope: 'block',
        line: access.line,
        column: access.column
      };
    }
    
    return null;
  }

  /**
   * Check for atomic operations
   * @private
   * @param {string} context - Code context
   * @param {Object} access - Access point
   * @returns {LockInfo|null}
   */
  _checkAtomicOperation(context, access) {
    // Pattern: AtomicInteger, atomic { ... }, compareAndSet, etc.
    const atomicPattern = /(?:Atomic\w+|atomic\s*\{|compareAndSet|getAndSet)/i;
    
    if (atomicPattern.test(context)) {
      return {
        type: 'atomic',
        target: access.name || 'unknown',
        scope: 'operation',
        line: access.line,
        column: access.column
      };
    }
    
    return null;
  }

  /**
   * Check for transactional patterns
   * @private
   * @param {string} context - Code context
   * @param {Object} access - Access point
   * @returns {LockInfo|null}
   */
  _checkTransactionalContext(context, access) {
    // Pattern: @Transactional, transaction { ... }, BEGIN TRANSACTION
    const transactionPattern = /(?:@Transactional|transaction\s*\{|BEGIN\s+TRANSACTION)/i;
    
    if (transactionPattern.test(context)) {
      return {
        type: 'transaction',
        target: access.name || 'unknown',
        scope: 'transaction',
        line: access.line,
        column: access.column
      };
    }
    
    return null;
  }

  /**
   * Determine lock scope from context
   * @private
   * @param {string} lockName - Name of the lock
   * @param {string} context - Code context
   * @returns {string} - Lock scope
   */
  _determineScope(lockName, context) {
    if (context.includes('static') || context.includes('global')) {
      return 'global';
    }
    if (context.includes('this.') || context.includes('self.')) {
      return 'instance';
    }
    return 'local';
  }

  /**
   * Check if two accesses are protected by the same lock
   * 
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
    
    // Same lock name and type
    if (lock1.lockName && lock1.lockName === lock2.lockName) {
      return true;
    }
    
    // Both use monitor on same target
    if (lock1.type === 'monitor' && lock2.type === 'monitor') {
      return lock1.target === lock2.target;
    }
    
    // Both in same transaction
    if (lock1.type === 'transaction' && lock2.type === 'transaction') {
      return true;
    }
    
    return false;
  }

  /**
   * Analyze lock coverage for a set of accesses
   * 
   * @param {Array} accesses - Array of access points
   * @param {Object} project - Project data
   * @returns {Object} - Lock coverage analysis
   */
  analyzeLockCoverage(accesses, project) {
    const protected_ = [];
    const unprotected = [];
    
    for (const access of accesses) {
      const atom = this._findAtomForAccess(access, project);
      const lockInfo = this.getLockProtection(access, atom, project);
      
      if (lockInfo) {
        protected_.push({ access, lock: lockInfo });
      } else {
        unprotected.push({ access });
      }
    }
    
    return {
      total: accesses.length,
      protected: protected_.length,
      unprotected: unprotected.length,
      protectedAccesses: protected_,
      unprotectedAccesses: unprotected,
      coverageRatio: accesses.length > 0 ? protected_.length / accesses.length : 0
    };
  }

  /**
   * Find potential deadlocks in lock ordering
   * 
   * @param {Array} accesses - Array of access points with lock info
   * @returns {Array} - Potential deadlock scenarios
   */
  findPotentialDeadlocks(accesses) {
    const deadlocks = [];
    const lockOrders = new Map();
    
    // Track lock acquisition orders
    for (const access of accesses) {
      if (access.locks?.length > 1) {
        const key = access.atom;
        lockOrders.set(key, access.locks);
      }
    }
    
    // Check for circular dependencies
    for (const [atom1, locks1] of lockOrders) {
      for (const [atom2, locks2] of lockOrders) {
        if (atom1 === atom2) continue;
        
        // Check if locks are acquired in opposite order
        if (this._isOppositeOrder(locks1, locks2)) {
          deadlocks.push({
            type: 'potential_deadlock',
            atoms: [atom1, atom2],
            lockOrders: [locks1, locks2]
          });
        }
      }
    }
    
    return deadlocks;
  }

  /**
   * Check if two lock orders are opposite (circular)
   * @private
   * @param {Array} order1 - First lock order
   * @param {Array} order2 - Second lock order
   * @returns {boolean}
   */
  _isOppositeOrder(order1, order2) {
    if (order1.length !== order2.length) return false;
    
    // Check if order2 is reverse of order1
    for (let i = 0; i < order1.length; i++) {
      if (order1[i] !== order2[order2.length - 1 - i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Find atom for an access point
   * @private
   * @param {Object} access - Access point
   * @param {Object} project - Project data
   * @returns {Object|null}
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

  /**
   * Check if race is mitigated by locking
   * 
   * @param {Object} race - Race condition object
   * @param {Object} project - Project data
   * @returns {Object} - Mitigation analysis
   */
  checkMitigation(race, project) {
    const mitigation = {
      hasMitigation: false,
      type: null,
      details: []
    };

    const [access1, access2] = race.accesses || [];
    if (!access1 || !access2) return mitigation;

    const atom1 = this._findAtomForAccess(access1, project);
    const atom2 = this._findAtomForAccess(access2, project);

    // Check for common lock
    if (this.haveCommonLock(access1, access2, atom1, atom2, project)) {
      mitigation.hasMitigation = true;
      mitigation.type = 'common_lock';
      mitigation.details.push('Both accesses protected by same lock');
    }

    // Check for atomic operations
    const lock1 = this.getLockProtection(access1, atom1, project);
    const lock2 = this.getLockProtection(access2, atom2, project);

    if (lock1?.type === 'atomic' && lock2?.type === 'atomic') {
      mitigation.hasMitigation = true;
      mitigation.type = 'atomic_operations';
      mitigation.details.push('Both accesses use atomic operations');
    }

    // Check for transaction isolation
    if (lock1?.type === 'transaction' || lock2?.type === 'transaction') {
      mitigation.hasMitigation = true;
      mitigation.type = 'transaction_isolation';
      mitigation.details.push('Access protected by transaction');
    }

    return mitigation;
  }
}

export default LockAnalyzer;
