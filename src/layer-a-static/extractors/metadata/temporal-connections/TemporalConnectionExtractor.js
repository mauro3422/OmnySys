/**
 * @fileoverview Temporal Connection Extractor
 * 
 * Main orchestrator for temporal connection detection using the Strategy pattern.
 * Delegates to specific detectors and analyzers for different temporal patterns.
 * 
 * SOLID Principles:
 * - SRP: Each detector handles one concern
 * - OCP: New detectors can be added without modifying existing code
 * - LSP: All detectors implement the same interface
 * - ISP: Clean interfaces between components
 * - DIP: Depends on abstractions (detector strategies)
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/TemporalConnectionExtractor
 */

import { detectTimeouts } from './detectors/timeout-detector.js';
import { detectIntervals } from './detectors/interval-detector.js';
import { detectPromises } from './detectors/promise-detector.js';
import { detectEvents } from './detectors/event-detector.js';
import { analyzeDelay } from './analyzers/delay-analyzer.js';
import { analyzeAsyncFlow } from './analyzers/async-flow-analyzer.js';

/**
 * @typedef {Object} TemporalDetectorStrategy
 * @property {string} name - Detector name
 * @property {Function} detect - Detection function
 * @property {Function} supports - Returns true if detector applies to code
 */

/**
 * @typedef {Object} TemporalPatterns
 * @property {Array} timers - Detected timers (timeouts and intervals)
 * @property {Object} asyncPatterns - Promise and async patterns
 * @property {Array} events - Event listener patterns
 * @property {Array} lifecycleHooks - Framework lifecycle hooks
 * @property {Object} executionOrder - Execution ordering constraints
 */

/**
 * @typedef {Object} TemporalConnection
 * @property {string} type - Connection type
 * @property {string} from - Source atom ID
 * @property {string} to - Target atom ID
 * @property {string} relationship - Relationship type
 * @property {number} confidence - Detection confidence (0-1)
 */

/**
 * Main extractor class for temporal connections
 * 
 * Uses Strategy pattern for extensible detector registration.
 * Each detector focuses on a single temporal pattern type.
 */
export class TemporalConnectionExtractor {
  /**
   * Creates a new extractor instance
   * @param {Object} [options] - Configuration options
   * @param {TemporalDetectorStrategy[]} [options.detectors] - Custom detectors
   * @param {boolean} [options.enableAnalysis=true] - Enable analysis phase
   */
  constructor(options = {}) {
    this.detectors = options.detectors || this._createDefaultDetectors();
    this.enableAnalysis = options.enableAnalysis !== false;
  }

  /**
   * Creates the default set of detectors
   * @returns {TemporalDetectorStrategy[]} Default detectors
   * @private
   */
  _createDefaultDetectors() {
    return [
      { name: 'timeout', detect: detectTimeouts, supports: (code) => /setTimeout\s*\(/.test(code) },
      { name: 'interval', detect: detectIntervals, supports: (code) => /setInterval\s*\(/.test(code) },
      { name: 'promise', detect: detectPromises, supports: (code) => /(?:async|await|Promise\.)/.test(code) },
      { name: 'event', detect: detectEvents, supports: (code) => /(?:addEventListener|\.on\s*\()/.test(code) }
    ];
  }

  /**
   * Registers a new detector strategy
   * @param {TemporalDetectorStrategy} detector - Detector to add
   * @returns {this} For method chaining
   */
  registerDetector(detector) {
    this.detectors.push(detector);
    return this;
  }

  /**
   * Extracts all temporal patterns from code
   * 
   * @param {string} code - Source code to analyze
   * @param {Object} [functionInfo] - Function metadata
   * @returns {TemporalPatterns} Detected temporal patterns
   */
  extractPatterns(code, functionInfo = {}) {
    const patterns = {
      timers: [],
      asyncPatterns: null,
      events: [],
      lifecycleHooks: [],
      executionOrder: null
    };

    // Run applicable detectors
    for (const detector of this.detectors) {
      if (detector.supports(code)) {
        const result = detector.detect(code, functionInfo);
        
        switch (detector.name) {
          case 'timeout':
            patterns.timers.push(...(Array.isArray(result) ? result : []));
            break;
          case 'interval':
            patterns.timers.push(...(Array.isArray(result) ? result : []));
            break;
          case 'promise':
            patterns.asyncPatterns = result;
            break;
          case 'event':
            patterns.events = Array.isArray(result) ? result : [];
            break;
        }
      }
    }

    // Legacy lifecycle hooks detection (kept for compatibility)
    patterns.lifecycleHooks = this._detectLifecycleHooks(code);
    patterns.executionOrder = this._detectExecutionOrder(code, functionInfo);

    // Optional analysis phase
    if (this.enableAnalysis && patterns.asyncPatterns) {
      patterns.asyncFlowAnalysis = analyzeAsyncFlow(patterns.asyncPatterns, code);
    }

    // Analyze timer delays
    if (this.enableAnalysis && patterns.timers.length > 0) {
      patterns.timerAnalysis = patterns.timers.map(t => ({
        ...t,
        analysis: analyzeDelay(t.delay || t.interval, t.type === 'setInterval' ? 'interval' : 'timeout')
      }));
    }

    return patterns;
  }

  /**
   * Detects lifecycle hooks (React, Vue, etc.)
   * @param {string} code - Source code
   * @returns {Array} Detected lifecycle hooks
   * @private
   */
  _detectLifecycleHooks(code) {
    const hooks = [];
    
    const reactHooks = [
      { pattern: /useEffect\s*\(/, name: 'useEffect', phase: 'render' },
      { pattern: /useLayoutEffect\s*\(/, name: 'useLayoutEffect', phase: 'layout' },
      { pattern: /useMemo\s*\(/, name: 'useMemo', phase: 'render' },
      { pattern: /useCallback\s*\(/, name: 'useCallback', phase: 'render' },
      { pattern: /useInsertionEffect\s*\(/, name: 'useInsertionEffect', phase: 'insertion' },
      { pattern: /componentDidMount/, name: 'componentDidMount', phase: 'mount' },
      { pattern: /componentWillMount/, name: 'componentWillMount', phase: 'pre-mount' },
      { pattern: /componentWillUnmount/, name: 'componentWillUnmount', phase: 'unmount' }
    ];
    
    for (const hook of reactHooks) {
      if (hook.pattern.test(code)) {
        const hookCode = code.split(hook.name)[1]?.split('}')[0] || '';
        const depsMatch = code.match(new RegExp(`${hook.name}\\s*\\([^,]*\\,\\s*(\\[[^\\]]*\\])`));
        
        hooks.push({
          type: hook.name,
          phase: hook.phase,
          dependencies: depsMatch ? depsMatch[1] : 'unknown',
          hasCleanup: /return\s*function|return\s*\(\)/.test(hookCode)
        });
      }
    }
    
    return hooks;
  }

  /**
   * Detects implicit execution ordering
   * @param {string} code - Source code
   * @param {Object} functionInfo - Function metadata
   * @returns {Object} Execution order constraints
   * @private
   */
  _detectExecutionOrder(code, functionInfo) {
    const order = {
      mustRunBefore: [],
      mustRunAfter: [],
      canRunInParallel: []
    };

    const name = functionInfo.name || '';
    
    // Check for initialization patterns in name
    const initPatterns = [
      /^(init|setup|configure|prepare|bootstrap|start|create|initialize)[A-Z]/,
      /^(init|setup|configure|prepare|bootstrap|start|create|initialize)$/
    ];
    const isInitByName = initPatterns.some(p => p.test(name));

    // Check for initialization behavior patterns
    const hasSingletonSetup = /(?:let|const|var)\s+\w+\s*=\s*(?:null|undefined)/.test(code) &&
                             /=\s*new\s+/.test(code);
    const hasConfigSetup = /(?:config|configuration|settings)\s*=/.test(code) &&
                          /(?:load|read|parse|default)/.test(code);
    const hasStateSetup = /(?:state|store|cache)\s*=/.test(code) &&
                         /(?:create|initialize|default)/.test(code);

    if (isInitByName || hasSingletonSetup || hasConfigSetup || hasStateSetup) {
      order.mustRunBefore.push({
        reason: 'initialization-provider',
        provides: ['config', 'state', 'singleton'],
        confidence: isInitByName ? 0.9 : 0.7,
        evidence: { isInitByName, hasSingletonSetup, hasConfigSetup, hasStateSetup }
      });
    }

    // Check for consumer patterns
    const consumerPattern = /(?:get|load|fetch)(?:Config|State|Data|Instance)/;
    if (consumerPattern.test(code)) {
      order.mustRunAfter.push({
        reason: 'initialization-consumer',
        needs: ['initialization'],
        confidence: 0.7
      });
    }

    return order;
  }

  /**
   * Extracts cross-function temporal connections
   * 
   * @param {Array} atoms - All function atoms
   * @returns {TemporalConnection[]} Temporal connections between atoms
   */
  extractConnections(atoms) {
    const connections = [];

    // Find initializers and consumers
    const initializers = atoms.filter(a => 
      a.temporal?.executionOrder?.mustRunBefore?.length > 0 ||
      this._isInitializerByName(a.name)
    );

    const consumers = atoms.filter(a =>
      a.temporal?.executionOrder?.mustRunAfter?.length > 0
    );

    // Create temporal dependencies
    for (const init of initializers) {
      for (const consumer of consumers) {
        if (init.id !== consumer.id) {
          connections.push({
            type: 'temporal-dependency',
            from: init.id,
            to: consumer.id,
            relationship: 'must-run-before',
            reason: 'initialization',
            confidence: 0.75,
            evidence: {
              initializer: init.name,
              consumer: consumer.name
            }
          });
        }
      }
    }

    // Detect lifecycle phase conflicts
    connections.push(...this._detectPhaseConflicts(atoms));

    return connections;
  }

  /**
   * Checks if a function name indicates initialization
   * @param {string} name - Function name
   * @returns {boolean} True if initializer pattern
   * @private
   */
  _isInitializerByName(name) {
    const patterns = [
      /^(init|setup|configure|prepare|bootstrap|start|create|initialize)[A-Z]/,
      /^(init|setup|configure|prepare|bootstrap|start|create|initialize)$/
    ];
    return patterns.some(p => p.test(name || ''));
  }

  /**
   * Detects conflicts between functions in same lifecycle phase
   * @param {Array} atoms - Function atoms
   * @returns {TemporalConnection[]} Phase conflict connections
   * @private
   */
  _detectPhaseConflicts(atoms) {
    const connections = [];
    
    // Collect all hooks grouped by phase
    const hooksByPhase = {};
    
    for (const atom of atoms) {
      const hooks = atom.temporal?.lifecycleHooks || [];
      for (const hook of hooks) {
        if (!hooksByPhase[hook.phase]) hooksByPhase[hook.phase] = [];
        hooksByPhase[hook.phase].push({ atom, hook });
      }
    }

    // Create conflict connections for shared phases
    for (const [phase, phaseHooks] of Object.entries(hooksByPhase)) {
      if (phaseHooks.length > 1) {
        for (let i = 0; i < phaseHooks.length; i++) {
          for (let j = i + 1; j < phaseHooks.length; j++) {
            connections.push({
              type: 'temporal-constraint',
              from: phaseHooks[i].atom.id,
              to: phaseHooks[j].atom.id,
              relationship: 'same-execution-phase',
              phase,
              potentialRace: true,
              confidence: 0.6
            });
          }
        }
      }
    }

    return connections;
  }

  /**
   * Extracts cross-file temporal connections
   * 
   * @param {Array} allAtoms - All atoms from the project
   * @returns {TemporalConnection[]} Cross-file connections
   */
  extractCrossFileConnections(allAtoms) {
    const connections = [];
    
    // Group atoms by file
    const atomsByFile = this._groupBy(allAtoms, a => a.filePath);
    
    // Identify init and consumer files
    const initFiles = [];
    const consumerFiles = [];
    
    for (const [filePath, atoms] of Object.entries(atomsByFile)) {
      const hasInitializer = atoms.some(a => 
        a.temporal?.executionOrder?.mustRunBefore?.length > 0 ||
        this._isInitializerByName(a.name)
      );
      const hasConsumer = atoms.some(a =>
        a.temporal?.executionOrder?.mustRunAfter?.length > 0
      );
      
      if (hasInitializer) initFiles.push({ filePath, atoms });
      if (hasConsumer) consumerFiles.push({ filePath, atoms });
    }

    // Connect files with import relationships
    for (const initFile of initFiles) {
      for (const consumerFile of consumerFiles) {
        const importsInit = this._checkImports(consumerFile.atoms, initFile.filePath);
        
        if (importsInit) {
          connections.push({
            type: 'cross-file-temporal',
            from: initFile.filePath,
            to: consumerFile.filePath,
            relationship: 'must-initialize-before',
            confidence: 0.8,
            evidence: {
              import: true,
              initializers: initFile.atoms
                .filter(a => a.temporal?.executionOrder?.mustRunBefore?.length > 0)
                .map(a => a.name)
            }
          });
        }
      }
    }

    return connections;
  }

  /**
   * Checks if atoms import from a specific file
   * @param {Array} atoms - Atoms to check
   * @param {string} filePath - File path to check for
   * @returns {boolean} True if imports exist
   * @private
   */
  _checkImports(atoms, filePath) {
    const normalizedPath = filePath.replace(/\.js$/, '');
    return atoms.some(atom => {
      const imports = atom.imports || [];
      return imports.some(imp => 
        imp.source?.includes(normalizedPath) ||
        normalizedPath.includes(imp.source?.replace(/\.js$/, ''))
      );
    });
  }

  /**
   * Groups array by key function
   * @param {Array} array - Array to group
   * @param {Function} keyFn - Key extraction function
   * @returns {Object} Grouped object
   * @private
   */
  _groupBy(array, keyFn) {
    const groups = {};
    for (const item of array) {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }
}

export default TemporalConnectionExtractor;
