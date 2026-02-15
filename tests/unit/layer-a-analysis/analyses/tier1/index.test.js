/**
 * @fileoverview Tests for tier1/index.js - Barrel Export
 */

import { describe, it, expect } from 'vitest';

describe('tier1/index.js', () => {
  it('should export all tier1 analysis functions', async () => {
    const tier1 = await import('#layer-a/analyses/tier1/index.js');
    
    expect(tier1).toHaveProperty('findUnusedExports');
    expect(tier1).toHaveProperty('findOrphanFiles');
    expect(tier1).toHaveProperty('findHotspots');
    expect(tier1).toHaveProperty('findCircularFunctionDeps');
    expect(tier1).toHaveProperty('classifyFunctionCycle');
    expect(tier1).toHaveProperty('classifyAllFunctionCycles');
    expect(tier1).toHaveProperty('findDeepDependencyChains');
  });

  it('should have findUnusedExports as a function', async () => {
    const { findUnusedExports } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof findUnusedExports).toBe('function');
  });

  it('should have findOrphanFiles as a function', async () => {
    const { findOrphanFiles } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof findOrphanFiles).toBe('function');
  });

  it('should have findHotspots as a function', async () => {
    const { findHotspots } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof findHotspots).toBe('function');
  });

  it('should have findCircularFunctionDeps as a function', async () => {
    const { findCircularFunctionDeps } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof findCircularFunctionDeps).toBe('function');
  });

  it('should have classifyFunctionCycle as a function', async () => {
    const { classifyFunctionCycle } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof classifyFunctionCycle).toBe('function');
  });

  it('should have classifyAllFunctionCycles as a function', async () => {
    const { classifyAllFunctionCycles } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof classifyAllFunctionCycles).toBe('function');
  });

  it('should have findDeepDependencyChains as a function', async () => {
    const { findDeepDependencyChains } = await import('#layer-a/analyses/tier1/index.js');
    expect(typeof findDeepDependencyChains).toBe('function');
  });
});
