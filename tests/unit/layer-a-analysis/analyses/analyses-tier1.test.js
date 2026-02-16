/**
 * @fileoverview Tier 1 Analyses - Meta-Factory
 * 
 * Agrupa todos los análisis de Tier 1
 */

import { describe, it, expect } from 'vitest';
import { 
  findHotspots, 
  findOrphanFiles, 
  findUnusedExports,
  findCircularFunctionDeps,
  findDeepDependencyChains,
  classifyFunctionCycle
} from '#layer-a/analyses/tier1/index.js';

describe('Analyses Tier 1', () => {
  it('findHotspots is exported and callable', () => {
    expect(typeof findHotspots).toBe('function');
  });

  it('findOrphanFiles is exported and callable', () => {
    expect(typeof findOrphanFiles).toBe('function');
  });

  it('findUnusedExports is exported and callable', () => {
    expect(typeof findUnusedExports).toBe('function');
  });

  it('findCircularFunctionDeps is exported and callable', () => {
    expect(typeof findCircularFunctionDeps).toBe('function');
  });

  it('findDeepDependencyChains is exported and callable', () => {
    expect(typeof findDeepDependencyChains).toBe('function');
  });

  it('classifyFunctionCycle is exported and callable', () => {
    expect(typeof classifyFunctionCycle).toBe('function');
  });
});
