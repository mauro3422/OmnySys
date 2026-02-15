/**
 * @fileoverview Phases Test Factory - Scenarios and Contracts
 */

import { AtomBuilder, FunctionInfoBuilder, PhaseContextBuilder } from './builders.js';

export const AtomScenarios = {
  /**
   * Simple utility function
   */
  simpleUtility: () => AtomBuilder.create('simpleUtility')
    .withComplexity(1)
    .withArchetype({ type: 'utility', severity: 2, confidence: 1.0 })
    .build(),

  /**
   * Exported function with callers
   */
  exportedFunction: () => AtomBuilder.create('exportedFunction')
    .isExported()
    .withComplexity(5)
    .calledBy(['caller1', 'caller2'])
    .withArchetype({ type: 'hot-path', severity: 7, confidence: 0.9 })
    .build(),

  /**
   * Dead function (not exported, no callers)
   */
  deadFunction: () => AtomBuilder.create('deadFunction')
    .isExported(false)
    .calledBy([])
    .withComplexity(3)
    .withArchetype({ type: 'dead-function', severity: 5, confidence: 1.0 })
    .build(),

  /**
   * Class method
   */
  classMethod: () => AtomBuilder.create('processData')
    .inClass('DataProcessor')
    .ofType('method')
    .calledBy([])
    .withComplexity(8)
    .withArchetype({ type: 'class-method', severity: 2, confidence: 1.0 })
    .build(),

  /**
   * God function (high complexity, many calls)
   */
  godFunction: () => AtomBuilder.create('doEverything')
    .withComplexity(25)
    .withExternalCalls([{ name: 'call1' }, { name: 'call2' }, { name: 'call3' }, { name: 'call4' }, { name: 'call5' }, { name: 'call6' }])
    .calledBy(['caller1', 'caller2', 'caller3', 'caller4', 'caller5', 'caller6', 'caller7', 'caller8', 'caller9', 'caller10', 'caller11'])
    .withArchetype({ type: 'god-function', severity: 10, confidence: 1.0 })
    .build(),

  /**
   * Async function with network calls
   */
  asyncNetworkFunction: () => AtomBuilder.create('fetchData')
    .isAsync()
    .withComplexity(5)
    .withSideEffects({
      all: [{ type: 'network' }],
      networkCalls: [{ url: 'https://api.example.com/data' }],
      domManipulations: [],
      storageAccess: [],
      consoleUsage: []
    })
    .hasErrorHandling(false)
    .withArchetype({ type: 'fragile-network', severity: 8, confidence: 0.9 })
    .build(),

  /**
   * Private utility function
   */
  privateUtility: () => AtomBuilder.create('privateHelper')
    .isExported(false)
    .calledBy(['internalCaller'])
    .withComplexity(3)
    .withSideEffects({ all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] })
    .withArchetype({ type: 'private-utility', severity: 3, confidence: 0.9 })
    .build(),

  /**
   * Function with error handling
   */
  robustFunction: () => AtomBuilder.create('robustFunction')
    .hasErrorHandling(true)
    .isAsync()
    .withComplexity(7)
    .withSideEffects({
      all: [{ type: 'network' }],
      networkCalls: [{ url: 'https://api.example.com/data' }],
      domManipulations: [],
      storageAccess: [],
      consoleUsage: []
    })
    .withArchetype({ type: 'standard', severity: 1, confidence: 1.0 })
    .build(),

  /**
   * Multiple atoms with call relationships
   */
  atomChain: () => {
    const atoms = [];
    const main = AtomBuilder.create('main')
      .withCalls([{ name: 'helper1' }, { name: 'helper2' }])
      .withInternalCalls(['helper1', 'helper2'])
      .calledBy([])
      .build();
    
    const helper1 = AtomBuilder.create('helper1')
      .withCalls([{ name: 'utility' }])
      .withInternalCalls(['utility'])
      .calledBy([main.id])
      .build();
    
    const helper2 = AtomBuilder.create('helper2')
      .withCalls([{ name: 'utility' }])
      .withInternalCalls(['utility'])
      .calledBy([main.id])
      .build();
    
    const utility = AtomBuilder.create('utility')
      .withCalls([])
      .withInternalCalls([])
      .calledBy([helper1.id, helper2.id])
      .build();
    
    return [main, helper1, helper2, utility];
  }
};

/**
 * Predefined phase context scenarios
 */
export const PhaseContextScenarios = {
  /**
   * Empty context
   */
  empty: () => PhaseContextBuilder.create().build(),

  /**
   * Context with single function
   */
  singleFunction: () => PhaseContextBuilder.create()
    .withFileInfo({
      functions: [FunctionInfoBuilder.create('testFunc').build()]
    })
    .withCode('function testFunc() { return true; }')
    .build(),

  /**
   * Context with multiple functions
   */
  multipleFunctions: () => PhaseContextBuilder.create()
    .withFileInfo({
      functions: [
        FunctionInfoBuilder.create('funcA').build(),
        FunctionInfoBuilder.create('funcB').build(),
        FunctionInfoBuilder.create('funcC').build()
      ]
    })
    .withCode(`
      function funcA() { return 1; }
      function funcB() { return funcA(); }
      function funcC() { return funcB(); }
    `)
    .build(),

  /**
   * Context with class methods
   */
  classMethods: () => PhaseContextBuilder.create()
    .withFileInfo({
      functions: [
        FunctionInfoBuilder.create('constructor').inClass('MyClass').build(),
        FunctionInfoBuilder.create('method1').inClass('MyClass').build(),
        FunctionInfoBuilder.create('method2').inClass('MyClass').build()
      ]
    })
    .withCode(`
      class MyClass {
        constructor() { this.value = 0; }
        method1() { return this.value; }
        method2() { this.method1(); }
      }
    `)
    .build(),

  /**
   * Context with atoms already extracted
   */
  withExtractedAtoms: () => PhaseContextBuilder.create()
    .withAtoms([
      AtomScenarios.simpleUtility(),
      AtomScenarios.exportedFunction()
    ])
    .build()
};

/**
 * Validation helpers for phase testing
 */
export class PhaseValidator {
  /**
   * Check if object is a valid phase context
   * @param {Object} context - Context to validate
   * @returns {boolean}
   */
  static isValidContext(context) {
    return context !== null && 
           typeof context === 'object' &&
           typeof context.filePath === 'string';
  }

  /**
   * Check if object is a valid atom
   * @param {Object} atom - Atom to validate
   * @returns {boolean}
   */
  static isValidAtom(atom) {
    return atom !== null &&
           typeof atom === 'object' &&
           typeof atom.id === 'string' &&
           typeof atom.name === 'string' &&
           typeof atom.type === 'string' &&
           typeof atom.filePath === 'string' &&
           typeof atom.line === 'number' &&
           typeof atom.complexity === 'number';
  }

  /**
   * Check if object is a valid archetype
   * @param {Object} archetype - Archetype to validate
   * @returns {boolean}
   */
  static isValidArchetype(archetype) {
    return archetype !== null &&
           typeof archetype === 'object' &&
           typeof archetype.type === 'string' &&
           typeof archetype.severity === 'number' &&
           typeof archetype.confidence === 'number';
  }

  /**
   * Validate atom has required fields
   * @param {Object} atom - Atom to validate
   * @param {string[]} fields - Required fields
   * @returns {boolean}
   */
  static atomHasFields(atom, fields) {
    if (!atom || typeof atom !== 'object') return false;
    return fields.every(field => field in atom);
  }

  /**
   * Validate array of atoms
   * @param {Array} atoms - Atoms to validate
   * @returns {boolean}
   */
  static areValidAtoms(atoms) {
    if (!Array.isArray(atoms)) return false;
    return atoms.every(atom => this.isValidAtom(atom));
  }

  /**
   * Validate phase result
   * @param {Object} result - Phase result
   * @returns {boolean}
   */
  static isValidPhaseResult(result) {
    return result !== null &&
           typeof result === 'object' &&
           this.isValidContext(result);
  }
}

/**
 * Contract definitions for phase testing
 */
export const PhaseContracts = {
  /**
   * Required context fields
   */
  REQUIRED_CONTEXT_FIELDS: [
    'filePath'
  ],

  /**
   * Required atom fields
   */
  REQUIRED_ATOM_FIELDS: [
    'id', 'name', 'type', 'filePath', 'line', 'complexity'
  ],

  /**
   * Required archetype fields
   */
  REQUIRED_ARCHETYPE_FIELDS: [
    'type', 'severity', 'confidence'
  ],

  /**
   * Valid archetype types
   */
  VALID_ARCHETYPE_TYPES: [
    'god-function',
    'fragile-network',
    'hot-path',
    'dead-function',
    'class-method',
    'private-utility',
    'utility',
    'standard'
  ]
};

/**
 * Main factory for creating phase test data
 */
