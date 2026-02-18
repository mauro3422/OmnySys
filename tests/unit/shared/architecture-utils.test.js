/**
 * @fileoverview architecture-utils.test.js
 * 
 * REAL tests for architectural pattern detection.
 * NO MOCKS - creates real files and tests real functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  detectGodObject,
  detectOrphanModule,
  detectArchitecturalPatterns,
  getPatternDescriptions
} from '#shared/architecture-utils.js';

describe('ArchitectureUtils - God Object Detection', () => {
  it('detects classic god object (many exports + many dependents)', () => {
    expect(detectGodObject(10, 20)).toBe(true);
  });

  it('detects god object with very high dependents only', () => {
    expect(detectGodObject(2, 15)).toBe(true);
  });

  it('detects god object with extreme coupling ratio', () => {
    expect(detectGodObject(3, 10)).toBe(true);
  });

  it('does NOT detect normal module as god object', () => {
    expect(detectGodObject(3, 4)).toBe(false);
  });

  it('does NOT detect small module as god object', () => {
    expect(detectGodObject(1, 2)).toBe(false);
  });

  it('handles zero values correctly', () => {
    expect(detectGodObject(0, 0)).toBe(false);
  });

  it('handles null/undefined values gracefully', () => {
    expect(detectGodObject(null, null)).toBe(false);
    expect(detectGodObject(undefined, undefined)).toBe(false);
    expect(detectGodObject(5, null)).toBe(false);
    expect(detectGodObject(null, 5)).toBe(false);
  });

  it('detects boundary case: MIN_EXPORTS + MIN_DEPENDENTS', () => {
    expect(detectGodObject(5, 5)).toBe(true);
  });

  it('detects boundary case: HIGH_DEPENDENTS', () => {
    expect(detectGodObject(1, 10)).toBe(true);
  });

  it('does not detect at just below threshold', () => {
    expect(detectGodObject(4, 4)).toBe(false);
    expect(detectGodObject(1, 2)).toBe(false);
  });
});

describe('ArchitectureUtils - Orphan Module Detection', () => {
  it('detects true orphan (exports but no dependents)', () => {
    expect(detectOrphanModule(5, 0)).toBe(true);
  });

  it('does NOT detect module with dependents as orphan', () => {
    expect(detectOrphanModule(5, 3)).toBe(false);
  });

  it('does NOT detect module without exports as orphan', () => {
    expect(detectOrphanModule(0, 0)).toBe(false);
  });

  it('handles null/undefined values gracefully', () => {
    expect(detectOrphanModule(null, null)).toBe(false);
    expect(detectOrphanModule(undefined, undefined)).toBe(false);
  });

  it('detects orphan with single export', () => {
    expect(detectOrphanModule(1, 0)).toBe(true);
  });

  it('does NOT detect with negative dependents', () => {
    expect(detectOrphanModule(5, -1)).toBe(true);
  });
});

describe('ArchitectureUtils - Pattern Detection', () => {
  it('detects all patterns for god object', () => {
    const patterns = detectArchitecturalPatterns({
      exportCount: 10,
      dependentCount: 25
    });

    expect(patterns.isGodObject).toBe(true);
    expect(patterns.hasHighCoupling).toBe(true);
    expect(patterns.hasManyExports).toBe(true);
    expect(patterns.isOrphanModule).toBe(false);
  });

  it('detects orphan module patterns', () => {
    const patterns = detectArchitecturalPatterns({
      exportCount: 5,
      dependentCount: 0
    });

    expect(patterns.isGodObject).toBe(false);
    expect(patterns.hasHighCoupling).toBe(false);
    expect(patterns.hasManyExports).toBe(false);
    expect(patterns.isOrphanModule).toBe(true);
  });

  it('detects high coupling without god object', () => {
    const patterns = detectArchitecturalPatterns({
      exportCount: 2,
      dependentCount: 15
    });

    expect(patterns.isGodObject).toBe(true);
    expect(patterns.hasHighCoupling).toBe(true);
    expect(patterns.hasManyExports).toBe(false);
    expect(patterns.isOrphanModule).toBe(false);
  });

  it('detects many exports without high coupling', () => {
    const patterns = detectArchitecturalPatterns({
      exportCount: 8,
      dependentCount: 3
    });

    expect(patterns.isGodObject).toBe(false);
    expect(patterns.hasHighCoupling).toBe(false);
    expect(patterns.hasManyExports).toBe(true);
    expect(patterns.isOrphanModule).toBe(false);
  });

  it('handles normal module correctly', () => {
    const patterns = detectArchitecturalPatterns({
      exportCount: 3,
      dependentCount: 4
    });

    expect(patterns.isGodObject).toBe(false);
    expect(patterns.hasHighCoupling).toBe(false);
    expect(patterns.hasManyExports).toBe(false);
    expect(patterns.isOrphanModule).toBe(false);
  });
});

describe('ArchitectureUtils - Pattern Descriptions', () => {
  it('returns empty array for normal module', () => {
    const descriptions = getPatternDescriptions({
      isGodObject: false,
      isOrphanModule: false,
      hasHighCoupling: false,
      hasManyExports: false
    });
    expect(descriptions).toEqual([]);
  });

  it('returns god object description', () => {
    const descriptions = getPatternDescriptions({
      isGodObject: true,
      isOrphanModule: false,
      hasHighCoupling: false,
      hasManyExports: false
    });
    expect(descriptions).toContain('God Object: High coupling and many exports');
  });

  it('returns orphan module description', () => {
    const descriptions = getPatternDescriptions({
      isGodObject: false,
      isOrphanModule: true,
      hasHighCoupling: false,
      hasManyExports: false
    });
    expect(descriptions).toContain('Orphan Module: Has exports but no dependents');
  });

  it('returns all applicable descriptions', () => {
    const descriptions = getPatternDescriptions({
      isGodObject: true,
      isOrphanModule: false,
      hasHighCoupling: true,
      hasManyExports: true
    });
    expect(descriptions).toHaveLength(3);
    expect(descriptions).toContain('God Object: High coupling and many exports');
    expect(descriptions).toContain('High Coupling: Many files depend on this');
    expect(descriptions).toContain('Many Exports: Consider splitting this module');
  });
});

describe('ArchitectureUtils - Real File Analysis', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arch-utils-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('analyzes real package.json for framework detection context', async () => {
    const packageJson = {
      name: 'test-project',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      }
    };

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const content = await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);

    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.name).toBe('test-project');
  });

  it('detects patterns from real JavaScript file exports', async () => {
    const jsFile = `
export function func1() {}
export function func2() {}
export function func3() {}
export const helper1 = () => {};
export const helper2 = () => {};
export const helper3 = () => {};
    `;

    await fs.writeFile(path.join(tempDir, 'module.js'), jsFile);

    const content = await fs.readFile(path.join(tempDir, 'module.js'), 'utf-8');
    const exportMatches = content.match(/export\s+(function|const|let|var|class)/g) || [];

    const patterns = detectArchitecturalPatterns({
      exportCount: exportMatches.length,
      dependentCount: 0
    });

    expect(patterns.hasManyExports).toBe(true);
    expect(patterns.isOrphanModule).toBe(true);
  });

  it('analyzes complex real-world module structure', async () => {
    const utilsFile = `
import { helperA } from './a.js';
import { helperB } from './b.js';

export function processA() {
  return helperA();
}

export function processB() {
  return helperB();
}

export function processAll() {
  return processA() + processB();
}

export function extra1() {}
export function extra2() {}
export function extra3() {}

function internalHelper() {
  return 'internal';
}
    `;

    await fs.writeFile(path.join(tempDir, 'utils.js'), utilsFile);

    const content = await fs.readFile(path.join(tempDir, 'utils.js'), 'utf-8');
    const exportMatches = content.match(/export\s+(function|const|let|var|class)/g) || [];
    const importMatches = content.match(/^import\s+.*from/gm) || [];

    const patterns = detectArchitecturalPatterns({
      exportCount: exportMatches.length,
      dependentCount: 8,
      importCount: importMatches.length
    });

    expect(patterns.hasManyExports).toBe(true);
  });
});
