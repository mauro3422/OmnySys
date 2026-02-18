/**
 * @fileoverview ValidationEngine Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ValidationEngine, ValidationContext, validate } from '../../../../src/validation/validation-engine/index.js';
import { RuleRegistry } from '../../../../src/validation/core/rules/index.js';
import { ValidationReport, ValidationResult } from '../../../../src/validation/core/results/index.js';

describe('ValidationEngine', () => {
  let tempDir;
  let omnysysDir;
  let registry;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validation-engine-test-'));
    omnysysDir = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysDir, { recursive: true });
    await fs.mkdir(path.join(omnysysDir, 'files'), { recursive: true });
    
    registry = new RuleRegistry();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('creates engine with default options', () => {
      const engine = new ValidationEngine();
      
      expect(engine.options.parallel).toBe(true);
      expect(engine.options.autoFix).toBe(false);
      expect(engine.options.stopOnCritical).toBe(true);
      expect(engine.strategies.size).toBeGreaterThan(0);
    });

    it('merges custom options', () => {
      const engine = new ValidationEngine({
        parallel: false,
        autoFix: true,
        maxConcurrency: 5
      });
      
      expect(engine.options.parallel).toBe(false);
      expect(engine.options.autoFix).toBe(true);
      expect(engine.options.maxConcurrency).toBe(5);
    });

    it('accepts custom registry', () => {
      const engine = new ValidationEngine({ registry });
      
      expect(engine.registry).toBe(registry);
    });

    it('initializes empty cache', () => {
      const engine = new ValidationEngine();
      
      expect(engine.cache.size).toBe(0);
    });
  });

  describe('validate', () => {
    it('returns ValidationReport', async () => {
      const engine = new ValidationEngine({ registry });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      expect(report).toBeInstanceOf(ValidationReport);
    });

    it('sets context projectPath', async () => {
      const engine = new ValidationEngine({ registry });
      
      await engine.validate(tempDir, omnysysDir);
      
      expect(engine.context.projectPath).toBe(tempDir);
      expect(engine.context.omnysysPath).toBe(omnysysDir);
    });

    it('returns empty report for empty project', async () => {
      const engine = new ValidationEngine({ registry });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      expect(report.stats.total).toBe(0);
    });

    it('validates with files', async () => {
      const sourceFile = path.join(tempDir, 'src', 'test.js');
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, 'export const test = 1;');
      
      const fileData = {
        path: 'src/test.js',
        id: 'src/test.js',
        type: 'file',
        exports: [{ name: 'test', type: 'named' }],
        imports: [],
        usedBy: []
      };
      const omnysysFilesDir = path.join(omnysysDir, 'files', 'src');
      await fs.mkdir(omnysysFilesDir, { recursive: true });
      await fs.writeFile(
        path.join(omnysysFilesDir, 'test.json'),
        JSON.stringify(fileData)
      );
      
      const engine = new ValidationEngine({ registry, enabledStrategies: [] });
      const report = await engine.validate(tempDir, omnysysDir);
      
      expect(report).toBeInstanceOf(ValidationReport);
    });
  });

  describe('validateSingle', () => {
    it('throws without context', async () => {
      const engine = new ValidationEngine();
      
      await expect(engine.validateSingle('entity1')).rejects.toThrow('Context not initialized');
    });

    it('throws for unknown entity', async () => {
      const engine = new ValidationEngine();
      engine.context = { getEntity: () => null };
      
      await expect(engine.validateSingle('unknown')).rejects.toThrow('Entity not found');
    });
  });

  describe('registerStrategy', () => {
    it('adds custom strategy', () => {
      const engine = new ValidationEngine();
      const strategy = {
        name: 'custom',
        execute: async () => []
      };
      
      engine.registerStrategy('custom', strategy);
      
      expect(engine.strategies.has('custom')).toBe(true);
    });
  });

  describe('setRunner', () => {
    it('sets custom runner', () => {
      const engine = new ValidationEngine();
      const runner = { name: 'custom' };
      
      engine.setRunner(runner);
      
      expect(engine.runner).toBe(runner);
    });
  });

  describe('clearCache', () => {
    it('clears cache', () => {
      const engine = new ValidationEngine();
      engine.cache.set('key', 'value');
      
      engine.clearCache();
      
      expect(engine.cache.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns engine stats', () => {
      const engine = new ValidationEngine({ parallel: true });
      
      const stats = engine.getStats();
      
      expect(stats.cacheSize).toBe(0);
      expect(stats.strategies).toContain('syntax');
      expect(stats.runner).toBeDefined();
      expect(stats.options.parallel).toBe(true);
    });
  });
});

describe('ValidationContext', () => {
  let tempDir;
  let omnysysDir;
  let context;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validation-context-test-'));
    omnysysDir = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysDir, { recursive: true });
    await fs.mkdir(path.join(omnysysDir, 'files'), { recursive: true });
    
    context = new ValidationContext(tempDir, omnysysDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('initializes empty maps', () => {
      expect(context.files.size).toBe(0);
      expect(context.atoms.size).toBe(0);
      expect(context.molecules.size).toBe(0);
      expect(context.modules.size).toBe(0);
    });

    it('sets paths', () => {
      expect(context.projectPath).toBe(tempDir);
      expect(context.omnysysPath).toBe(omnysysDir);
    });
  });

  describe('load', () => {
    it('loads files from omnysysdata', async () => {
      const fileData = {
        path: 'src/test.js',
        id: 'src/test.js',
        type: 'file'
      };
      await fs.mkdir(path.join(omnysysDir, 'files', 'src'), { recursive: true });
      await fs.writeFile(
        path.join(omnysysDir, 'files', 'src', 'test.json'),
        JSON.stringify(fileData)
      );
      
      await context.load();
      
      expect(context.files.size).toBe(1);
      expect(context.files.has('src/test.js')).toBe(true);
    });

    it('handles missing files directory', async () => {
      await fs.rm(path.join(omnysysDir, 'files'), { recursive: true });
      
      await expect(context.load()).resolves.not.toThrow();
    });

    it('loads index.json', async () => {
      const indexData = { version: '1.0.0', entities: 5 };
      await fs.writeFile(
        path.join(omnysysDir, 'index.json'),
        JSON.stringify(indexData)
      );
      
      await context.load();
      
      expect(context.index.version).toBe('1.0.0');
    });
  });

  describe('getSource', () => {
    it('reads source file', async () => {
      const sourceFile = path.join(tempDir, 'src', 'test.js');
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, 'const x = 1;');
      
      const code = await context.getSource('src/test.js');
      
      expect(code).toBe('const x = 1;');
    });

    it('caches source code', async () => {
      const sourceFile = path.join(tempDir, 'test.js');
      await fs.writeFile(sourceFile, 'const x = 1;');
      
      await context.getSource('test.js');
      await context.getSource('test.js');
      
      expect(context.sourceCache.has('test.js')).toBe(true);
    });

    it('returns null for missing file', async () => {
      const code = await context.getSource('nonexistent.js');
      
      expect(code).toBe(null);
    });
  });

  describe('getEntity', () => {
    it('finds entity in files', () => {
      const file = { id: 'file1', type: 'file' };
      context.files.set('file1', file);
      
      expect(context.getEntity('file1')).toBe(file);
    });

    it('finds entity in atoms', () => {
      const atom = { id: 'atom1', type: 'atom' };
      context.atoms.set('atom1', atom);
      
      expect(context.getEntity('atom1')).toBe(atom);
    });

    it('finds entity in molecules', () => {
      const molecule = { id: 'mol1', type: 'molecule' };
      context.molecules.set('mol1', molecule);
      
      expect(context.getEntity('mol1')).toBe(molecule);
    });

    it('finds entity in modules', () => {
      const module = { id: 'mod1', type: 'module' };
      context.modules.set('mod1', module);
      
      expect(context.getEntity('mod1')).toBe(module);
    });

    it('returns undefined for unknown entity', () => {
      expect(context.getEntity('unknown')).toBe(undefined);
    });
  });

  describe('getEntitiesByType', () => {
    it('returns files for file type', () => {
      context.files.set('f1', { id: 'f1' });
      context.files.set('f2', { id: 'f2' });
      
      const entities = context.getEntitiesByType('file');
      
      expect(entities).toHaveLength(2);
    });

    it('returns atoms for atom type', () => {
      context.atoms.set('a1', { id: 'a1' });
      
      const entities = context.getEntitiesByType('atom');
      
      expect(entities).toHaveLength(1);
    });

    it('returns empty array for unknown type', () => {
      const entities = context.getEntitiesByType('unknown');
      
      expect(entities).toEqual([]);
    });
  });

  describe('hasEntity', () => {
    it('returns true for existing entity', () => {
      context.files.set('f1', { id: 'f1' });
      
      expect(context.hasEntity('f1')).toBe(true);
    });

    it('returns false for missing entity', () => {
      expect(context.hasEntity('unknown')).toBe(false);
    });
  });
});

describe('validate function', () => {
  let tempDir;
  let omnysysDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-fn-test-'));
    omnysysDir = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysDir, { recursive: true });
    await fs.mkdir(path.join(omnysysDir, 'files'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates engine and validates', async () => {
    const report = await validate(tempDir, { 
      omnysysPath: omnysysDir,
      enabledStrategies: []
    });
    
    expect(report).toBeInstanceOf(ValidationReport);
  });

  it('uses default omnysysPath', async () => {
    const report = await validate(tempDir, { enabledStrategies: [] });
    
    expect(report).toBeInstanceOf(ValidationReport);
  });
});
