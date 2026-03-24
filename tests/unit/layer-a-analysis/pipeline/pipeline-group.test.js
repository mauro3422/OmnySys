/**
 * @fileoverview Pipeline System - Meta-Factory Test Suite
 * 
 * Agrupa TODOS los módulos de pipeline:
 * - Main Pipeline (single-file, save, enhance, scan, resolve, parse, normalize, graph)
 * - Phases (ExtractionPhase, AtomExtractionPhase, ChainBuildingPhase)
 * - Atom Extraction (builders, graph, metadata, extraction)
 * - Molecular Chains (builders, graph-builder, argument-mapper)
 * 
 * @module tests/unit/layer-a-analysis/pipeline/pipeline-group
 */

import { describe, it, expect } from 'vitest';
import * as phases from '#layer-a/pipeline/phases/index.js';
import * as molecularChains from '#layer-a/pipeline/molecular-chains/index.js';
import * as atomExtraction from '#layer-a/pipeline/phases/atom-extraction/index.js';
import * as atomBuilders from '#layer-a/pipeline/phases/atom-extraction/builders/index.js';
import * as atomExtractionModule from '#layer-a/pipeline/phases/atom-extraction/extraction/index.js';
import { deriveModuleName } from '#layer-a/pipeline/single-file.js';

describe('Pipeline - Phases', () => {
  it('exports all phase classes', () => {
    expect(typeof phases.ExtractionPhase).toBe('function');
    expect(typeof phases.AtomExtractionPhase).toBe('function');
    expect(typeof phases.ChainBuildingPhase).toBe('function');
  });
});

describe('Pipeline - Atom Extraction', () => {
  it('exports AtomExtractionPhase class', () => {
    expect(typeof atomExtraction.AtomExtractionPhase).toBe('function');
  });
});

describe('Pipeline - Atom Builders', () => {
  it('exports atom builder functions', () => {
    expect(typeof atomBuilders.buildAtomMetadata).toBe('function');
    expect(typeof atomBuilders.enrichWithDNA).toBe('function');
  });

  it('persists canonical JSON metadata surfaces on atoms', () => {
    const atom = atomBuilders.buildAtomMetadata({
      functionInfo: {
        name: 'saveAtom',
        type: 'function',
        line: 42,
        isExported: true
      },
      filePath: 'src/example.js',
      linesOfCode: 12,
      complexity: 3,
      sideEffects: { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] },
      callGraph: { internalCalls: [], externalCalls: [] },
      temporal: { lifecycleHooks: [], cleanupPatterns: [] },
      temporalPatterns: {},
      typeContracts: {},
      errorFlow: {},
      performanceHints: { nestedLoops: [], blockingOperations: [] },
      performanceMetrics: {},
      semanticDomain: null,
      dataFlowV2: null,
      functionCode: 'export function saveAtom() {}',
      imports: [{ source: './dep.js', type: 'static', names: ['dep'], line: 1 }],
      jsdocContracts: null,
      treeSitter: null
    });

    expect(atom.importsJson).toEqual([
      { source: './dep.js', type: 'static', specifiers: ['dep'], line: 1 }
    ]);
    expect(atom.exportsJson).toEqual([
      { name: 'saveAtom', type: 'function', line: 42 }
    ]);
    expect(atom.usesJson).toEqual([
      {
        kind: 'import',
        source: './dep.js',
        specifiers: ['dep'],
        line: 1
      }
    ]);
    expect(atom.sideEffectsJson).toEqual({
      all: [],
      networkCalls: [],
      domManipulations: [],
      storageAccess: [],
      consoleUsage: []
    });
  });

  it('derives test callback type and direct uses from the atom metadata', () => {
    const atom = atomBuilders.buildAtomMetadata({
      functionInfo: {
        name: 'beforeEach(setup)',
        type: 'function',
        line: 12,
        isExported: false,
        calls: [{ name: 'bootstrap', type: 'internal', line: 13 }]
      },
      filePath: 'tests/example.test.js',
      linesOfCode: 6,
      complexity: 1,
      sideEffects: { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] },
      callGraph: { internalCalls: [{ name: 'bootstrap', line: 13 }], externalCalls: [] },
      temporal: { lifecycleHooks: [], cleanupPatterns: [] },
      temporalPatterns: {},
      typeContracts: {},
      errorFlow: {},
      performanceHints: { nestedLoops: [], blockingOperations: [] },
      performanceMetrics: {},
      semanticDomain: null,
      dataFlowV2: null,
      functionCode: 'beforeEach(() => bootstrap())',
      imports: [{ source: './setup.js', type: 'static', names: ['setup'], line: 1 }],
      jsdocContracts: null,
      treeSitter: null
    });

    expect(atom.isTestCallback).toBe(true);
    expect(atom.testCallbackType).toBe('beforeEach');
    expect(atom.usesJson).toEqual([
      { kind: 'call', name: 'bootstrap', type: 'internal', line: 13 },
      { kind: 'import', source: './setup.js', specifiers: ['setup'], line: 1 }
    ]);
  });

  it('summarizes Tree-Sitter scope types across all accesses', () => {
    const atom = atomBuilders.buildAtomMetadata({
      functionInfo: {
        name: 'scopeDemo',
        type: 'function',
        line: 10,
        isExported: false
      },
      filePath: 'src/scope-demo.js',
      linesOfCode: 8,
      complexity: 2,
      sideEffects: { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] },
      callGraph: { internalCalls: [], externalCalls: [] },
      temporal: { lifecycleHooks: [], cleanupPatterns: [] },
      temporalPatterns: {},
      typeContracts: {},
      errorFlow: {},
      performanceHints: { nestedLoops: [], blockingOperations: [] },
      performanceMetrics: {},
      semanticDomain: null,
      dataFlowV2: null,
      functionCode: 'function scopeDemo() { return 1; }',
      imports: [],
      jsdocContracts: null,
      treeSitter: {
        sharedStateAccess: [
          { scopeType: 'module', line: 11 },
          { scopeType: 'closure', line: 12 },
          { scopeType: 'closure', line: 13 }
        ],
        eventEmitters: [],
        eventListeners: []
      }
    });

    expect(atom.scopeType).toBe('closure');
    expect(atom._meta.scopeTypes).toEqual(expect.arrayContaining(['module', 'closure']));
    expect(atom._meta.scopeTypeBreakdown).toEqual({
      module: 1,
      closure: 2
    });
  });
});

describe('Pipeline - Atom Extraction Module', () => {
  it('exports atom extraction functions', () => {
    expect(typeof atomExtractionModule.extractAtoms).toBe('function');
    expect(typeof atomExtractionModule.extractAtomMetadata).toBe('function');
  });
});

describe('Pipeline - File Utilities', () => {
  it('derives module names from project-relative paths', () => {
    expect(deriveModuleName('src/shared/compiler/index.js')).toBe('src');
    expect(deriveModuleName('single-file.js')).toBe('_root');
  });
});

describe('Pipeline - Molecular Chains', () => {
  it('exports all chain builder classes', () => {
    expect(typeof molecularChains.ChainBuilder).toBe('function');
    expect(typeof molecularChains.ChainIdGenerator).toBe('function');
    expect(typeof molecularChains.ChainStepBuilder).toBe('function');
    expect(typeof molecularChains.ChainSummaryBuilder).toBe('function');
  });

  it('exports utility functions', () => {
    expect(typeof molecularChains.isValidChainNode).toBe('function');
    expect(typeof molecularChains.getUniqueFunctions).toBe('function');
  });

  it('exports default ChainBuilder', () => {
    expect(typeof molecularChains.default).toBe('function');
    expect(molecularChains.default).toBe(molecularChains.ChainBuilder);
  });
});
