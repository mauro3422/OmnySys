/**
 * @fileoverview ground-truth-validator.test.js
 * 
 * REAL tests for Ground Truth Validator.
 * NO MOCKS - creates real files and validates real data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  ValidationEngine,
  validateGroundTruth,
  ValidationContext,
  ValidationResult,
  ReportGenerator,
  BaseValidator,
  AtomValidator,
  CallGraphValidator
} from '#shared/ground-truth-validator/index.js';
import {
  AtomBuilder,
  OmnySystemDataBuilder
} from '../../factories/shared/builders.js';

describe('ValidationContext - Basic Operations', () => {
  let tempDir;
  let context;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-test-'));
    const omnysysPath = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysPath, { recursive: true });
    await fs.mkdir(path.join(omnysysPath, 'atoms'), { recursive: true });
    context = new ValidationContext(tempDir, omnysysPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('stores project and omnysys paths', () => {
    expect(context.projectPath).toBe(tempDir);
    expect(context.omnysysPath).toContain('.omnysysdata');
  });

  it('has cache mechanism', () => {
    context.setCached('test-key', { data: 'test' });
    expect(context.getCached('test-key')).toEqual({ data: 'test' });
  });

  it('returns undefined for missing cache key', () => {
    expect(context.getCached('non-existent')).toBeUndefined();
  });

  it('loads atoms from directory', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom(AtomBuilder.create('src_utils.js::helper').build());
    await builder.write();

    const atoms = await context.getAllAtoms();

    expect(atoms.size).toBe(1);
    expect(atoms.has('src_utils.js::helper')).toBe(true);
  });

  it('caches loaded atoms', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom(AtomBuilder.create('test.js::func').build());
    await builder.write();

    await context.getAllAtoms();
    expect(context._cache.has('atoms')).toBe(true);

    const atoms2 = await context.getAllAtoms();
    expect(atoms2).toBe(context._cache.get('atoms'));
  });

  it('handles empty atoms directory', async () => {
    const atoms = await context.getAllAtoms();
    expect(atoms.size).toBe(0);
  });
});

describe('ValidationResult - Ground Truth', () => {
  let result;

  beforeEach(() => {
    result = new ValidationResult();
  });

  it('starts with valid=true', () => {
    expect(result.valid).toBe(true);
  });

  it('starts with empty phases', () => {
    expect(result.phases).toEqual([]);
  });

  it('addPhase accumulates phases', () => {
    result.addPhase({
      phase: 'atoms',
      valid: true,
      stats: { filesChecked: 5 }
    });

    expect(result.phases).toHaveLength(1);
    expect(result.stats.filesChecked).toBe(5);
  });

  it('addPhase sets valid to false on invalid phase', () => {
    result.addPhase({
      phase: 'atoms',
      valid: false,
      stats: {}
    });

    expect(result.valid).toBe(false);
  });

  it('accumulates mismatches', () => {
    result.addPhase({
      phase: 'test',
      valid: false,
      mismatches: [{ type: 'ERROR', message: 'test' }]
    });

    expect(result.mismatches).toHaveLength(1);
  });

  it('addWarning tracks warnings', () => {
    result.addWarning({ message: 'test warning' });

    expect(result.warnings).toHaveLength(1);
    expect(result.stats.warnings).toBe(1);
  });
});

describe('ReportGenerator - Output', () => {
  it('generates report for valid result', () => {
    const result = new ValidationResult();
    result.duration = 100;
    result.stats.filesChecked = 10;
    result.stats.atomsVerified = 50;

    const report = ReportGenerator.generate(result);

    expect(report).toContain('VALID');
    expect(report).toContain('100ms');
    expect(report).toContain('Files checked: 10');
    expect(report).toContain('Atoms verified: 50');
  });

  it('generates report for invalid result', () => {
    const result = new ValidationResult();
    result.valid = false;
    result.mismatches = [{ type: 'MISSING_FUNCTION', file: 'test.js' }];

    const report = ReportGenerator.generate(result);

    expect(report).toContain('MISMATCHES FOUND');
    expect(report).toContain('MISSING_FUNCTION');
  });

  it('includes mismatches in report', () => {
    const result = new ValidationResult();
    result.addPhase({
      phase: 'test',
      valid: false,
      mismatches: [
        { type: 'ERROR', file: 'a.js', function: 'foo' },
        { type: 'ERROR', file: 'b.js', callee: 'bar' }
      ]
    });

    const report = ReportGenerator.generate(result);

    expect(report).toContain('ERROR');
    expect(report).toContain('Function: foo');
    expect(report).toContain('Call: bar');
  });
});

describe('BaseValidator - Abstract Class', () => {
  it('requires validate implementation', async () => {
    const validator = new BaseValidator('test');

    await expect(validator.validate({})).rejects.toThrow('Must implement validate()');
  });

  it('canValidate returns true by default', () => {
    const validator = new BaseValidator('test');
    expect(validator.canValidate({})).toBe(true);
  });

  it('stores name', () => {
    const validator = new BaseValidator('my-validator');
    expect(validator.name).toBe('my-validator');
  });
});

describe('AtomValidator - Ground Truth', () => {
  let validator;
  let tempDir;
  let projectPath;
  let omnysysPath;

  beforeEach(async () => {
    validator = new AtomValidator();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atom-validator-'));
    projectPath = tempDir;
    omnysysPath = path.join(tempDir, '.omnysysdata');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('canValidate returns true', () => {
    expect(validator.canValidate({})).toBe(true);
  });

  it('validates atoms against source files', async () => {
    const sourceFile = path.join(projectPath, 'utils.js');
    await fs.writeFile(sourceFile, `
export function processData() {
  return 'data';
}
    `);

    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom({
      id: 'utils.js::processData',
      name: 'processData',
      line: 2,
      type: 'atom',
      filePath: 'utils.js'
    });
    await builder.write();

    const context = new ValidationContext(projectPath, omnysysPath);
    const result = await validator.validate(context);

    expect(result.stats.atomsVerified).toBe(1);
  });

  it('detects missing source file', async () => {
    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom({
      id: 'non_existent.js::missing',
      name: 'missing',
      type: 'atom'
    });
    await builder.write();

    const context = new ValidationContext(projectPath, omnysysPath);
    const result = await validator.validate(context);

    expect(result.mismatches.some(m => m.type === 'SOURCE_FILE_MISSING')).toBe(true);
  });

  it('detects missing function in source', async () => {
    const sourceFile = path.join(projectPath, 'test.js');
    await fs.writeFile(sourceFile, `
export function existingFunc() {}
    `);

    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom({
      id: 'test.js::nonExistentFunc',
      name: 'nonExistentFunc',
      line: 999,
      type: 'atom',
      filePath: 'test.js'
    });
    await builder.write();

    const context = new ValidationContext(projectPath, omnysysPath);
    const result = await validator.validate(context);

    expect(result.mismatches.some(m => m.type === 'FUNCTION_NOT_FOUND')).toBe(true);
  });

  it('verifyFunctionExists finds by line number', () => {
    const sourceCode = `line1
function targetFunc() {
}
line4`;

    const result = validator.verifyFunctionExists(
      { name: 'targetFunc', line: 2 },
      sourceCode
    );

    expect(result.found).toBe(true);
    expect(result.atLine).toBe(2);
  });

  it('verifyFunctionExists finds by pattern', () => {
    const sourceCode = `
const myHelper = () => {};
function otherFunc() {}
    `;

    const result = validator.verifyFunctionExists(
      { name: 'myHelper' },
      sourceCode
    );

    expect(result.found).toBe(true);
  });

  it('verifyFunctionExists returns false for missing function', () => {
    const sourceCode = 'export function foo() {}';

    const result = validator.verifyFunctionExists(
      { name: 'bar' },
      sourceCode
    );

    expect(result.found).toBe(false);
  });

  it('escapeRegex escapes special characters', () => {
    expect(validator.escapeRegex('func$name')).toBe('func\\$name');
    expect(validator.escapeRegex('func.name')).toBe('func\\.name');
  });
});

describe('ValidationEngine - Integration', () => {
  let tempDir;
  let projectPath;
  let omnysysPath;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-test-'));
    projectPath = tempDir;
    omnysysPath = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysPath, { recursive: true });
    await fs.mkdir(path.join(omnysysPath, 'atoms'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('runs all registered validators', async () => {
    const engine = new ValidationEngine(projectPath, omnysysPath);
    const result = await engine.validate();

    expect(result.phases.length).toBeGreaterThan(0);
  });

  it('registers default validators', () => {
    const engine = new ValidationEngine(projectPath, omnysysPath);

    expect(engine.validators.length).toBeGreaterThan(0);
    expect(engine.validators.some(v => v.name === 'atom-validator')).toBe(true);
  });

  it('allows custom validator registration', async () => {
    const engine = new ValidationEngine(projectPath, omnysysPath);

    const customValidator = new (class extends BaseValidator {
      constructor() {
        super('custom-validator');
      }
      async validate() {
        return { phase: 'custom', valid: true, stats: {} };
      }
    })();

    engine.register(customValidator);
    const result = await engine.validate();

    expect(result.phases.some(p => p.phase === 'custom')).toBe(true);
  });

  it('handles validator errors gracefully', async () => {
    const engine = new ValidationEngine(projectPath, omnysysPath);

    const failingValidator = new (class extends BaseValidator {
      constructor() {
        super('failing-validator');
      }
      async validate() {
        throw new Error('Intentional failure');
      }
    })();

    engine.register(failingValidator);
    const result = await engine.validate();

    expect(result.phases.some(p => p.phase === 'failing-validator' && !p.valid)).toBe(true);
  });

  it('tracks duration', async () => {
    const engine = new ValidationEngine(projectPath, omnysysPath);
    const result = await engine.validate();

    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('validateGroundTruth - Convenience Function', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-test-'));
    const omnysysPath = path.join(tempDir, '.omnysysdata');
    await fs.mkdir(omnysysPath, { recursive: true });
    await fs.mkdir(path.join(omnysysPath, 'atoms'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns ValidationResult', async () => {
    const result = await validateGroundTruth(
      tempDir,
      path.join(tempDir, '.omnysysdata')
    );

    expect(result).toBeInstanceOf(ValidationResult);
  });

  it('validates with paths', async () => {
    const result = await validateGroundTruth(
      tempDir,
      path.join(tempDir, '.omnysysdata')
    );

    expect(result.phases.length).toBeGreaterThan(0);
  });
});

describe('Ground Truth Validator - Real File Scenarios', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gt-real-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('validates real project with atoms', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(path.join(srcDir, 'utils.js'), `
export function formatDate(date) {
  return date.toISOString();
}

export function parseDate(str) {
  return new Date(str);
}
    `);

    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom({
      id: 'src/utils.js::formatDate',
      name: 'formatDate',
      line: 2,
      type: 'atom',
      filePath: 'src/utils.js'
    });
    builder.addAtom({
      id: 'src/utils.js::parseDate',
      name: 'parseDate',
      line: 6,
      type: 'atom',
      filePath: 'src/utils.js'
    });
    await builder.write();

    const result = await validateGroundTruth(
      tempDir,
      path.join(tempDir, '.omnysysdata')
    );

    expect(result.stats.atomsVerified).toBe(2);
  });

  it('detects mismatch when function removed', async () => {
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    await fs.writeFile(path.join(srcDir, 'module.js'), `
export function existingFunction() {}
    `);

    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom({
      id: 'src/module.js::removedFunction',
      name: 'removedFunction',
      type: 'atom',
      filePath: 'src/module.js'
    });
    await builder.write();

    const result = await validateGroundTruth(
      tempDir,
      path.join(tempDir, '.omnysysdata')
    );

    expect(result.mismatches.some(m => m.type === 'FUNCTION_NOT_FOUND')).toBe(true);
  });

  it('validates complex nested structure', async () => {
    const nestedPath = path.join(tempDir, 'src', 'components', 'ui');
    await fs.mkdir(nestedPath, { recursive: true });

    await fs.writeFile(path.join(nestedPath, 'Button.js'), `
export function Button({ label, onClick }) {
  return { label, onClick };
}

export function IconButton({ icon, onClick }) {
  return { icon, onClick };
}
    `);

    const builder = OmnySystemDataBuilder.create(tempDir);
    builder.addAtom({
      id: 'src/components/ui/Button.js::Button',
      name: 'Button',
      line: 2,
      type: 'atom',
      filePath: 'src/components/ui/Button.js'
    });
    builder.addAtom({
      id: 'src/components/ui/Button.js::IconButton',
      name: 'IconButton',
      line: 6,
      type: 'atom',
      filePath: 'src/components/ui/Button.js'
    });
    await builder.write();

    const result = await validateGroundTruth(
      tempDir,
      path.join(tempDir, '.omnysysdata')
    );

    expect(result.valid).toBe(true);
  });
});
