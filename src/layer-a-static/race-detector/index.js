/**
 * @fileoverview index.js
 *
 * Race Condition Detector - Entry Point
 * 
 * Detects race conditions using modular trackers and strategies.
 * Refactored to follow SRP, OCP, and Fractal Architecture A→B→C.
 *
 * ARCHITECTURE:
 *   Layer A: Atomic metadata (from molecular-extractor.js)
 *   Layer B: Pattern detection (trackers + strategies)
 *   Layer C: Race results exposed via MCP tools
 *
 * @module race-detector/index
 * @version 5.0.0
 * @phase 4
 */

import { 
  GlobalVariableTracker,
  ModuleStateTracker,
  ExternalResourceTracker,
  SingletonTracker,
  ClosureTracker
} from './trackers/index.js';

import {
  ReadWriteRaceStrategy,
  WriteWriteRaceStrategy,
  InitErrorStrategy
} from './strategies/index.js';

import { RacePatternMatcher } from './race-pattern-matcher.js';
import { RiskScorer } from './risk-scorer.js';
import { createLogger } from '#utils/logger.js';

// Create logger for this module
const logger = createLogger('race-detector');

/**
 * Race Detection Pipeline
 * Orchestrates trackers and strategies to detect race conditions
 */
export class RaceDetectionPipeline {
  constructor(projectData) {
    this.project = projectData;
    this.sharedState = new Map();
    this.races = [];
    this.warnings = [];

    // Initialize trackers (Layer B - State Identification)
    this.trackers = [
      new GlobalVariableTracker(projectData),
      new ModuleStateTracker(projectData),
      new ExternalResourceTracker(projectData),
      new SingletonTracker(projectData),
      new ClosureTracker(projectData)
    ];

    // Initialize strategies (Layer B - Pattern Detection)
    this.strategies = [
      new ReadWriteRaceStrategy(),
      new WriteWriteRaceStrategy(),
      new InitErrorStrategy()
    ];

    // Supporting components
    this.patternMatcher = new RacePatternMatcher();
    this.riskScorer = new RiskScorer();
  }

  /**
   * Execute the complete race detection pipeline
   * @returns {Object} - Detection results
   */
  detect() {
    logger.info('Starting race condition detection pipeline...');

    // Phase 1: Collect shared state (Layer B)
    this.collectSharedState();
    logger.info(`Found ${this.sharedState.size} shared state items`);

    // Phase 2: Detect races using strategies (Layer B)
    this.detectRaces();
    logger.info(`Detected ${this.races.length} potential races`);

    // Phase 3: Enrich with patterns (Layer B)
    this.enrichWithPatterns();

    // Phase 4: Check mitigations (Layer B)
    this.checkMitigations();

    // Phase 5: Calculate severities (Layer B)
    this.calculateSeverities();

    // Phase 6: Generate summary (Layer C)
    const summary = this.generateSummary();

    logger.info(`Race detection complete: ${this.races.length} races found`);

    return {
      races: this.races,
      warnings: this.warnings,
      summary
    };
  }

  /**
   * Phase 1: Collect shared state from all trackers
   * @private
   */
  collectSharedState() {
    for (const tracker of this.trackers) {
      const trackedState = tracker.track();
      
      // Merge into shared state map
      for (const [key, accesses] of trackedState) {
        if (!this.sharedState.has(key)) {
          this.sharedState.set(key, []);
        }
        this.sharedState.get(key).push(...accesses);
      }
    }
  }

  /**
   * Phase 2: Detect races using strategies
   * @private
   */
  detectRaces() {
    for (const strategy of this.strategies) {
      const detected = strategy.detect(this.sharedState, this.project);
      this.races.push(...detected);
    }
  }

  /**
   * Phase 3: Enrich races with pattern information
   * @private
   */
  enrichWithPatterns() {
    for (const race of this.races) {
      const patterns = this.patternMatcher.detectPatterns(race);
      
      if (patterns.length > 0) {
        race.pattern = patterns[0].key;
        race.patternName = patterns[0].name;
        race.allPatterns = patterns.map(p => p.key);
      }
    }
  }

  /**
   * Phase 4: Check for existing mitigations
   * @private
   */
  checkMitigations() {
    for (const race of this.races) {
      const mitigation = this.findMitigation(race);
      
      if (mitigation) {
        race.hasMitigation = true;
        race.mitigationType = mitigation.type;
      }
    }

    // Filter out mitigated races (unless critical)
    this.races = this.races.filter(race => 
      !race.hasMitigation || race.severity === 'critical'
    );
  }

  /**
   * Phase 5: Calculate severity for each race
   * @private
   */
  calculateSeverities() {
    for (const race of this.races) {
      race.severity = this.riskScorer.calculate(race, this.project);
    }
  }

  /**
   * Phase 6: Generate detection summary
   * @private
   */
  generateSummary() {
    const byType = {};
    const bySeverity = {};

    for (const race of this.races) {
      byType[race.type] = (byType[race.type] || 0) + 1;
      bySeverity[race.severity] = (bySeverity[race.severity] || 0) + 1;
    }

    return {
      totalRaces: this.races.length,
      totalWarnings: this.warnings.length,
      byType,
      bySeverity,
      sharedStateItems: this.sharedState.size,
      trackersUsed: this.trackers.length,
      strategiesUsed: this.strategies.length,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Find mitigation for a detected race condition
   * Analyzes multiple protection mechanisms to determine if race is mitigated
   * 
   * @private
   * @param {Object} race - Race condition object
   * @returns {Object|null} - Mitigation info or null if not mitigated
   */
  findMitigation(race) {
    const [access1, access2] = race.accesses;
    const mitigations = [];

    // Check 1: Explicit locks (mutexes, semaphores, etc.)
    const lock1 = this.hasLockProtection(access1);
    const lock2 = this.hasLockProtection(access2);
    if (lock1 && lock2) {
      mitigations.push({ type: 'lock', description: 'Both accesses protected by locks' });
    } else if (lock1 || lock2) {
      mitigations.push({ type: 'partial-lock', description: 'Only one access has lock protection' });
    }

    // Check 2: Same transaction (serializes operations)
    if (this.sameTransaction(access1, access2)) {
      return { 
        type: 'transaction', 
        description: 'Both accesses in same database transaction',
        confidence: 'high'
      };
    }

    // Check 3: Both operations are atomic
    const atomic1 = this.isAtomicOperation(access1);
    const atomic2 = this.isAtomicOperation(access2);
    if (atomic1 && atomic2) {
      mitigations.push({ type: 'atomic', description: 'Both operations are atomic' });
    }

    // Check 4: Async queue serialization
    const queue1 = this.hasAsyncQueue(access1);
    const queue2 = this.hasAsyncQueue(access2);
    if (queue1 && queue2 && this.sameQueue(access1, access2)) {
      return { 
        type: 'queue', 
        description: 'Serialized by async queue',
        confidence: 'high'
      };
    }

    // Check 5: Same business flow (sequential execution)
    if (this.sameBusinessFlowDetailed(access1, access2)) {
      return {
        type: 'sequential',
        description: 'Operations are always sequential in same flow',
        confidence: 'medium'
      };
    }

    // Check 6: Immutable data structures
    if (this.usesImmutableData(access1) && this.usesImmutableData(access2)) {
      return {
        type: 'immutable',
        description: 'Uses immutable data structures',
        confidence: 'medium'
      };
    }

    // Return strongest mitigation or null
    if (mitigations.length > 0) {
      // Prefer complete mitigations over partial
      const complete = mitigations.find(m => !m.type.startsWith('partial-'));
      return complete || mitigations[0];
    }

    return null;
  }

  /**
   * Check if two accesses use the same queue
   * @private
   */
  sameQueue(access1, access2) {
    // If both in same file and use queue, likely same queue
    if (access1.file === access2.file) return true;
    
    // Check for shared queue instance
    const atom1 = this.findAtomById(access1.atom);
    const atom2 = this.findAtomById(access2.atom);
    
    if (!atom1?.code || !atom2?.code) return false;
    
    // Extract queue names and compare
    const queue1 = this.extractQueueName(atom1.code);
    const queue2 = this.extractQueueName(atom2.code);
    
    return queue1 && queue2 && queue1 === queue2;
  }

  /**
   * Extract queue name from code
   * @private
   */
  extractQueueName(code) {
    const patterns = [
      /queue\s*[=:]\s*(\w+)/i,
      /new\s+\w*Queue\s*\(\s*['"](\w+)['"]/i,
      /queue\(["'](\w+)["']\)/i
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Detailed business flow analysis
   * @private
   */
  sameBusinessFlowDetailed(access1, access2) {
    // Use the strategy's implementation
    for (const strategy of this.strategies) {
      if (strategy.sameBusinessFlow) {
        return strategy.sameBusinessFlow(access1, access2, this.project);
      }
    }
    return false;
  }

  /**
   * Check if access uses immutable data structures
   * @private
   */
  usesImmutableData(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;
    
    const immutablePatterns = [
      /Immutable\./i,
      /\.asMutable\(/i,
      /\.asImmutable\(/i,
      /Object\.freeze\(/i,
      /Readonly</i,
      /immer/i,
      /produce\s*\(/i
    ];
    
    return immutablePatterns.some(p => p.test(atom.code));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MITIGATION DETECTION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if access has lock protection
   * Detects various locking mechanisms (mutexes, semaphores, distributed locks)
   * @param {Object} access - Access point to check
   * @returns {boolean} - True if protected by lock
   */
  hasLockProtection(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const lockPatterns = [
      // Mutexes and semaphores
      /\b(mutex|lock|semaphore)\./i,
      /\bLock\s*\(/i,
      /\bacquire\s*\(/i,
      /\bwithLock\s*\(/i,
      /await\s+.*\.lock\(/i,
      /Atomics\./i,
      /navigator\.locks/i,
      
      // JavaScript/TypeScript specific
      /navigator\.locks\.request/i,
      /LockManager/i,
      
      // Framework patterns
      /async\s*\.mutate\(/i,  // TanStack Query
      /useMutation\(/i,        // React Query
      
      // Database locks
      /SELECT.*FOR\s+UPDATE/i,
      /LOCK\s+TABLES/i,
      
      // Distributed locks
      /redis.*lock/i,
      /redlock/i,
      /etcd.*lock/i,
      /zookeeper.*lock/i,
      
      // Language-specific constructs
      /synchronized\s*\(/i,
      /@synchronized/i,
      /ReentrantLock/i
    ];

    return lockPatterns.some(p => p.test(atom.code));
  }

  /**
   * Check if operation is atomic (cannot be interrupted)
   * Detects atomic operations at hardware, database, and language levels
   * @param {Object} access - Access point to check
   * @returns {boolean} - True if operation is atomic
   */
  isAtomicOperation(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    // Pattern 1: JavaScript Atomics API
    const atomicPatterns = [
      /Atomics\.(add|sub|and|or|xor|exchange|compareExchange|load|store)\(/i
    ];
    
    // Pattern 2: Single-line synchronous operations
    const lines = atom.code.split('\n');
    const isSingleLineSync = lines.length <= 1 && !access.isAsync;
    
    // Pattern 3: Database atomic operations
    const dbAtomicPatterns = [
      /\.findOneAndUpdate\(/i,
      /\.findOneAndReplace\(/i,
      /\.findOneAndDelete\(/i,
      /UPSERT/i,
      /ON\s+CONFLICT/i,
      /INSERT\s+OR\s+REPLACE/i
    ];
    
    // Pattern 4: Counter/atomic increment patterns
    const counterPatterns = [
      /\+\+\s*\w+/i,
      /\w+\s*\+\+/i,
      /\+=\s*1/i,
      /-=/i
    ];
    
    // Check if single operation on primitive (atomic in JS for primitives)
    const isPrimitiveOperation = /^(const|let|var)?\s*\w+\s*[=\+\-*/]=/.test(atom.code.trim());

    return atomicPatterns.some(p => p.test(atom.code)) ||
           dbAtomicPatterns.some(p => p.test(atom.code)) ||
           (isSingleLineSync && isPrimitiveOperation);
  }

  /**
   * Check if access is within a database transaction
   * Detects SQL and NoSQL transaction boundaries
   * @param {Object} access - Access point to check
   * @returns {boolean} - True if in transaction
   */
  isInTransaction(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const transactionPatterns = [
      // SQL transactions
      /BEGIN\s+TRANSACTION/i,
      /START\s+TRANSACTION/i,
      /COMMIT/i,
      /ROLLBACK/i,
      /SAVEPOINT/i,
      
      // Prisma
      /prisma\.\$transaction/i,
      /prisma\.[\w]+\.transaction/i,
      /\$transaction\s*\(/i,
      
      // Sequelize
      /sequelize\.transaction/i,
      /\.transaction\s*\(/i,
      
      // MongoDB
      /session\.startTransaction/i,
      /session\.withTransaction/i,
      /session\.commitTransaction/i,
      /session\.abortTransaction/i,
      
      // TypeORM
      /getManager\(\)\.transaction/i,
      /queryRunner\.startTransaction/i,
      
      // Mongoose
      /\.session\s*\(/i,
      
      // Knex
      /knex\.transaction/i,
      
      // Objection.js
      /transaction\s*\(\s*\w+\s*=>/i
    ];

    return transactionPatterns.some(p => p.test(atom.code));
  }

  /**
   * Check if two accesses are in the same transaction
   * This means they are serialized by the transaction isolation
   * @param {Object} access1 - First access
   * @param {Object} access2 - Second access
   * @returns {boolean} - True if same transaction
   */
  sameTransaction(access1, access2) {
    // If both in transactions, check if it's the same transaction context
    const inT1 = this.isInTransaction(access1);
    const inT2 = this.isInTransaction(access2);
    
    if (!inT1 || !inT2) return false;
    
    // Find transaction context for each
    const context1 = this.findTransactionContext(access1);
    const context2 = this.findTransactionContext(access2);
    
    if (!context1 || !context2) return false;
    
    // Same atom = definitely same transaction
    if (access1.atom === access2.atom) return true;
    
    // Same file and both in transaction blocks = likely same transaction
    if (access1.file === access2.file && context1.sameBlock) {
      return true;
    }
    
    // Check if called sequentially within same transaction function
    if (context1.transactionFunction === context2.transactionFunction) {
      return this.areSequentialInTransaction(access1, access2);
    }
    
    return false;
  }

  /**
   * Find transaction context for an access
   * @private
   */
  findTransactionContext(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return null;
    
    // Look for transaction boundaries
    const txPatterns = [
      { type: 'prisma', start: /prisma\.\$transaction\s*\(/i, end: /\)/ },
      { type: 'sequelize', start: /sequelize\.transaction\s*\(/i, end: /\)/ },
      { type: 'mongodb', start: /session\.withTransaction\s*\(/i, end: /\)/ },
      { type: 'typeorm', start: /getManager\(\)\.transaction\s*\(/i, end: /\)/ }
    ];
    
    for (const pattern of txPatterns) {
      if (pattern.start.test(atom.code)) {
        return {
          type: pattern.type,
          sameBlock: true,
          transactionFunction: access.atom
        };
      }
    }
    
    return null;
  }

  /**
   * Check if two accesses are sequential within a transaction
   * @private
   */
  areSequentialInTransaction(access1, access2) {
    // In most transaction isolation levels, operations are sequential
    // within the same transaction
    return true;
  }

  /**
   * Check if access uses async queue for serialization
   * Detects various queue implementations that serialize async operations
   * @param {Object} access - Access point to check
   * @returns {boolean} - True if uses queue
   */
  hasAsyncQueue(access) {
    const atom = this.findAtomById(access.atom);
    if (!atom?.code) return false;

    const queuePatterns = [
      // Queue libraries
      /async\s*\.queue/i,
      /p-queue/i,
      /bull|bullmq/i,
      /bee-queue/i,
      /kue/i,
      /Agenda/i,
      /node-cron/i,
      /Bree/i,
      
      // Rate limiting / Concurrency control
      /p-limit/i,
      /p-throttle/i,
      /bottleneck/i,
      /rate-limiter/i,
      
      // Framework patterns
      /queue\.add\s*\(/i,
      /queue\.process/i,
      /queue\.on\s*\(/i,
      /concurrent\s*:\s*\d+/i,
      /concurrency\s*:\s*\d+/i,
      
      // Worker pools
      /worker_threads/i,
      /Worker\s*\(/i,
      /workerpool/i,
      /worker-farm/i,
      /jest-worker/i,
      
      // Message queues
      /amqp/i,
      /rabbitmq/i,
      /kafka/i,
      /sqs/i,
      /pubsub/i,
      
      // Task queues
      /task\.queue/i,
      /job\.queue/i,
      /background\.job/i
    ];

    return queuePatterns.some(p => p.test(atom.code));
  }

  /**
   * Find captured variables in closures that might cause races
   * Analyzes closure scope for shared state access
   * @param {Object} atom - Atom to analyze
   * @returns {Array<Object>} - Captured variables that could cause races
   */
  findCapturedVariables(atom) {
    if (!atom?.code) return [];
    
    const captured = [];
    
    try {
      // Parse the atom's code to find closures
      const code = atom.code;
      
      // Pattern 1: Arrow functions capturing outer variables
      const arrowFnPattern = /\(([^)]*)\)\s*=>\s*{([^}]*)}/gs;
      let match;
      
      while ((match = arrowFnPattern.exec(code)) !== null) {
        const body = match[2];
        
        // Find variables referenced but not declared in closure
        const declaredInClosure = this.extractDeclarations(match[1] + body);
        const referenced = this.extractReferences(body);
        
        for (const ref of referenced) {
          if (!declaredInClosure.includes(ref)) {
            // Check if it's a shared state variable
            const isShared = this.isSharedStateVariable(ref, atom);
            if (isShared) {
              captured.push({
                name: ref,
                type: 'closure-captured',
                location: 'arrow-function',
                risk: this.calculateCaptureRisk(ref, atom)
              });
            }
          }
        }
      }
      
      // Pattern 2: Regular function expressions
      const fnExprPattern = /function\s*\w*\s*\([^)]*\)\s*{([^}]*)}/gs;
      while ((match = fnExprPattern.exec(code)) !== null) {
        const body = match[1];
        const declaredInClosure = this.extractDeclarations(body);
        const referenced = this.extractReferences(body);
        
        for (const ref of referenced) {
          if (!declaredInClosure.includes(ref)) {
            const isShared = this.isSharedStateVariable(ref, atom);
            if (isShared) {
              captured.push({
                name: ref,
                type: 'closure-captured',
                location: 'function-expression',
                risk: this.calculateCaptureRisk(ref, atom)
              });
            }
          }
        }
      }
      
      // Pattern 3: Async callbacks (higher risk)
      const asyncCallbackPattern = /\.(then|catch|finally)\s*\([^)]*\)\s*=>/g;
      if (asyncCallbackPattern.test(code)) {
        const asyncVars = this.extractAsyncCallbackVars(code);
        for (const ref of asyncVars) {
          const isShared = this.isSharedStateVariable(ref, atom);
          if (isShared) {
            captured.push({
              name: ref,
              type: 'closure-captured',
              location: 'async-callback',
              risk: 'high'
            });
          }
        }
      }
      
    } catch (error) {
      // If parsing fails, return empty array
      logger?.debug(`Failed to parse closures in ${atom.id}: ${error.message}`);
    }
    
    return captured;
  }

  /**
   * Extract variable declarations from code
   * @private
   */
  extractDeclarations(code) {
    const declarations = [];
    const patterns = [
      /\b(const|let|var)\s+(\w+)/g,
      /function\s+(\w+)/g,
      /(\w+)\s*=>/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        declarations.push(match[2] || match[1]);
      }
    }
    
    return declarations;
  }

  /**
   * Extract variable references from code
   * @private
   */
  extractReferences(code) {
    const references = [];
    const pattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match;
    
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];
      // Filter out keywords and common non-variable names
      if (!this.isJavaScriptKeyword(name)) {
        references.push(name);
      }
    }
    
    return [...new Set(references)];
  }

  /**
   * Extract variables used in async callbacks
   * @private
   */
  extractAsyncCallbackVars(code) {
    const vars = [];
    // Look for variables used in .then(), .catch(), etc.
    const pattern = /\.(then|catch|finally)\s*\(\s*(?:\(?\s*(\w+)\s*\)?)?\s*=>\s*([^)]*)/g;
    let match;
    
    while ((match = pattern.exec(code)) !== null) {
      const body = match[3];
      vars.push(...this.extractReferences(body));
    }
    
    return vars;
  }

  /**
   * Check if a variable name is a JavaScript keyword
   * @private
   */
  isJavaScriptKeyword(name) {
    const keywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
      'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'typeof',
      'instanceof', 'in', 'of', 'async', 'await', 'class', 'extends', 'super',
      'import', 'export', 'default', 'from', 'as', 'with', 'yield'
    ];
    return keywords.includes(name);
  }

  /**
   * Check if a variable is shared state
   * @private
   */
  isSharedStateVariable(name, atom) {
    // Common patterns for shared state
    const sharedPatterns = [
      /^window\./i,
      /^global\./i,
      /^localStorage/i,
      /^sessionStorage/i,
      /^document\./i,
      /^process\./i,
      /^shared/i,
      /^cache/i,
      /^state/i
    ];
    
    return sharedPatterns.some(p => p.test(name));
  }

  /**
   * Calculate risk level of captured variable
   * @private
   */
  calculateCaptureRisk(variable, atom) {
    if (atom.isAsync) return 'high';
    if (variable.includes('state') || variable.includes('cache')) return 'high';
    return 'medium';
  }

  /**
   * Find atom by its ID
   * @private
   */
  findAtomById(atomId) {
    const [filePath, functionName] = atomId.split('::');
    
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        if (molecule.filePath?.endsWith(filePath)) {
          for (const atom of molecule.atoms || []) {
            if (atom.name === functionName || atom.id === atomId) {
              return atom;
            }
          }
        }
      }
    }
    
    return null;
  }
}

/**
 * Legacy class name for backwards compatibility
 * @deprecated Use RaceDetectionPipeline instead
 */
export class RaceConditionDetector extends RaceDetectionPipeline {}

/**
 * Convenience function for quick detection
 * @param {Object} projectData - Project data with modules/atoms
 * @returns {Object} - Detection results
 */
export function detectRaceConditions(projectData) {
  const pipeline = new RaceDetectionPipeline(projectData);
  return pipeline.detect();
}

export default RaceDetectionPipeline;
