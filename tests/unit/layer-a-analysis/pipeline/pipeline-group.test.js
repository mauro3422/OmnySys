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
});

describe('Pipeline - Atom Extraction Module', () => {
  it('exports atom extraction functions', () => {
    expect(typeof atomExtractionModule.extractAtoms).toBe('function');
    expect(typeof atomExtractionModule.extractAtomMetadata).toBe('function');
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
