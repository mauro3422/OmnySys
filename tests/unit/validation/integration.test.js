/**
 * @fileoverview Validation System Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ValidationEngine, ValidationContext } from '../../../src/validation/validation-engine/index.js';
import { RuleRegistry, ValidationRule } from '../../../src/validation/core/rules/index.js';
import { ValidationResult, ValidationReport, ValidationSeverity } from '../../../src/validation/core/results/index.js';
import { registerSourceRules } from '../../../src/validation/rules/source/index.js';
import { registerInvariants } from '../../../src/validation/invariants/system-invariants.js';

describe('Validation System Integration', () => {
  let tempDir;
  let omnysysDir;
  let registry;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validation-integration-test-'));
    omnysysDir = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysDir, { recursive: true });
    await fs.mkdir(path.join(omnysysDir, 'files'), { recursive: true });
    
    registry = new RuleRegistry();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createSourceFile(relativePath, content) {
    const fullPath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async function createOmnySysFile(relativePath, data) {
    const fullPath = path.join(omnysysDir, 'files', relativePath + '.json');
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data));
  }

  describe('end-to-end validation', () => {
    it('validates a simple project', async () => {
      await createSourceFile('src/main.js', `
        import { helper } from './utils.js';
        export function main() {
          return helper();
        }
      `);
      
      await createSourceFile('src/utils.js', `
        export function helper() {
          return 'help';
        }
      `);
      
      await createOmnySysFile('src/main', {
        path: 'src/main.js',
        id: 'src/main.js',
        type: 'file',
        exports: [{ name: 'main', type: 'named' }],
        imports: [{ source: './utils.js' }],
        usedBy: []
      });
      
      await createOmnySysFile('src/utils', {
        path: 'src/utils.js',
        id: 'src/utils.js',
        type: 'file',
        exports: [{ name: 'helper', type: 'named' }],
        imports: [],
        usedBy: ['src/main.js']
      });
      
      registerSourceRules(registry);
      
      const engine = new ValidationEngine({ 
        registry,
        enabledStrategies: ['syntax']
      });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      expect(report).toBeInstanceOf(ValidationReport);
      expect(report.stats.total).toBeGreaterThan(0);
    });

    it('detects file existence issues', async () => {
      await createOmnySysFile('missing', {
        path: 'nonexistent.js',
        id: 'nonexistent.js',
        type: 'file',
        exports: [],
        imports: [],
        usedBy: []
      });
      
      registerSourceRules(registry);
      
      const engine = new ValidationEngine({ 
        registry,
        enabledStrategies: ['syntax']
      });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      const fileResults = report.results.filter(r => r.entity === 'nonexistent.js');
      expect(fileResults.some(r => !r.valid)).toBe(true);
    });

    it.skip('BUG: detects export inconsistencies', async () => {
      await createSourceFile('test.js', 'const foo = 1;');
      
      await createOmnySysFile('test', {
        path: 'test.js',
        id: 'test.js',
        type: 'file',
        exports: [{ name: 'nonexistent', type: 'named' }],
        imports: [],
        usedBy: []
      });
      
      registerSourceRules(registry);
      
      const engine = new ValidationEngine({ 
        registry,
        enabledStrategies: ['syntax']
      });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      const exportResults = report.results.filter(r => r.field && r.field.includes('export'));
      expect(exportResults.some(r => !r.valid)).toBe(true);
    });
  });

  describe('invariants', () => {
    it.skip('BUG: detects duplicate IDs', async () => {
      await createOmnySysFile('file1', {
        path: 'file1.js',
        id: 'duplicate-id',
        type: 'file',
        exports: [],
        imports: [],
        usedBy: []
      });
      
      await createOmnySysFile('file2', {
        path: 'file2.js',
        id: 'duplicate-id',
        type: 'file',
        exports: [],
        imports: [],
        usedBy: []
      });
      
      registerInvariants(registry);
      
      const engine = new ValidationEngine({ 
        registry,
        enabledStrategies: ['syntax']
      });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      expect(report.hasCriticalViolations).toBe(true);
    });
  });

  describe('custom rules', () => {
    it('uses custom validation rules', async () => {
      const customRule = new ValidationRule({
        id: 'custom.test',
        name: 'Custom Test',
        layer: 'source',
        appliesTo: ['file'],
        requires: ['path'],
        validate: async (entity) => {
          if (entity.path.includes('fail')) {
            return ValidationResult.invalid(entity.id, 'custom', 'pass', 'fail');
          }
          return ValidationResult.valid(entity.id, 'custom');
        }
      });
      
      registry.register(customRule);
      
      await createOmnySysFile('pass', {
        path: 'pass.js',
        id: 'pass.js',
        type: 'file',
        exports: [],
        imports: []
      });
      
      await createOmnySysFile('fail', {
        path: 'fail.js',
        id: 'fail.js',
        type: 'file',
        exports: [],
        imports: []
      });
      
      const engine = new ValidationEngine({ 
        registry,
        enabledStrategies: ['syntax']
      });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      const passResult = report.results.find(r => r.entity === 'pass.js');
      const failResult = report.results.find(r => r.entity === 'fail.js');
      
      expect(passResult.valid).toBe(true);
      expect(failResult.valid).toBe(false);
    });
  });

  describe('caching', () => {
    it('caches validation results', async () => {
      let validateCount = 0;
      
      const countingRule = new ValidationRule({
        id: 'counting.rule',
        name: 'Counting Rule',
        layer: 'source',
        appliesTo: ['file'],
        validate: async (entity) => {
          validateCount++;
          return ValidationResult.valid(entity.id, 'test');
        }
      });
      
      registry.register(countingRule);
      
      await createOmnySysFile('test', {
        path: 'test.js',
        id: 'test.js',
        type: 'file',
        exports: [],
        imports: []
      });
      
      const engine = new ValidationEngine({ 
        registry,
        cacheResults: true,
        enabledStrategies: ['syntax']
      });
      
      await engine.validate(tempDir, omnysysDir);
      const firstCount = validateCount;
      
      await engine.validate(tempDir, omnysysDir);
      
      expect(validateCount).toBe(firstCount);
    });
  });

  describe('error handling', () => {
    it('handles rule errors gracefully', async () => {
      const errorRule = new ValidationRule({
        id: 'error.rule',
        name: 'Error Rule',
        layer: 'source',
        appliesTo: ['file'],
        validate: async () => {
          throw new Error('Rule failed');
        }
      });
      
      registry.register(errorRule);
      
      await createOmnySysFile('test', {
        path: 'test.js',
        id: 'test.js',
        type: 'file',
        exports: [],
        imports: []
      });
      
      const engine = new ValidationEngine({ 
        registry,
        enabledStrategies: ['syntax']
      });
      
      const report = await engine.validate(tempDir, omnysysDir);
      
      const errorResult = report.results.find(r => r.actual && r.actual.includes('error'));
      expect(errorResult).toBeDefined();
      expect(errorResult.severity).toBe(ValidationSeverity.CRITICAL);
    });
  });
});
