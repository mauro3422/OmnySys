import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyntaxValidator, createSyntaxValidator } from '#core/atomic-editor/validators/syntax-validator.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SyntaxValidator', () => {
  let validator;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'syntax-test-'));
    validator = new SyntaxValidator(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores projectPath', () => {
      expect(validator.projectPath).toBe(tempDir);
    });
  });

  describe('validate()', () => {
    it('returns valid for correct JavaScript syntax', async () => {
      const result = await validator.validate('test.js', 'const x = 1;');

      expect(result.valid).toBe(true);
    });

    it('returns valid for function declarations', async () => {
      const result = await validator.validate('test.js', 'function hello() { return "world"; }');

      expect(result.valid).toBe(true);
    });

    it('returns valid for class declarations', async () => {
      const result = await validator.validate('test.js', 'class Foo { constructor() { this.x = 1; } }');

      expect(result.valid).toBe(true);
    });

    it('returns valid for async functions', async () => {
      const result = await validator.validate('test.js', 'async function fetch() { return await Promise.resolve(1); }');

      expect(result.valid).toBe(true);
    });

    it('returns invalid for syntax errors', async () => {
      const result = await validator.validate('test.js', 'const x = {}}');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for missing closing brace', async () => {
      const result = await validator.validate('test.js', 'function foo() { return 1;');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for missing closing parenthesis', async () => {
      const result = await validator.validate('test.js', 'const add = (a, b => a + b;');

      expect(result.valid).toBe(false);
    });

    it('extracts line number from error', async () => {
      const code = 'const x = 1;\nconst y = {}}';
      const result = await validator.validate('test.js', code);

      expect(result.valid).toBe(false);
      expect(result.line).toBeDefined();
    });

    it('extracts column from error when available', async () => {
      const result = await validator.validate('test.js', 'const x = {}}');

      expect(result.valid).toBe(false);
      if (result.column !== null) {
        expect(typeof result.column).toBe('number');
      }
    });

    it('includes details in error result', async () => {
      const result = await validator.validate('test.js', 'const x = {}}');

      expect(result.valid).toBe(false);
      expect(result.details).toBeDefined();
    });

    it('handles complex valid code', async () => {
      const code = `
        import { foo } from 'bar';
        const obj = { a: 1, b: 2 };
        export function test() {
          return obj.a + obj.b;
        }
      `;
      const result = await validator.validate('test.js', code);

      expect(result.valid).toBe(true);
    });

    it('handles multi-line invalid code', async () => {
      const code = `const a = 1;
const b = 2;
const c = {{
const d = 4;`;
      const result = await validator.validate('test.js', code);

      expect(result.valid).toBe(false);
    });

    it('cleans up temporary file after validation', async () => {
      await validator.validate('test.js', 'const x = 1;');

      const tmpFile = path.join(tempDir, '.tmp-validation.js');
      await expect(fs.access(tmpFile)).rejects.toThrow();
    });

    it('cleans up temporary file even on error', async () => {
      await validator.validate('test.js', 'const x = {}}');

      const tmpFile = path.join(tempDir, '.tmp-validation.js');
      await expect(fs.access(tmpFile)).rejects.toThrow();
    });
  });

  describe('isAvailable()', () => {
    it('returns true', () => {
      expect(validator.isAvailable()).toBe(true);
    });
  });

  describe('createSyntaxValidator()', () => {
    it('creates validator instance', () => {
      const instance = createSyntaxValidator('/path/to/project');

      expect(instance).toBeInstanceOf(SyntaxValidator);
      expect(instance.projectPath).toBe('/path/to/project');
    });
  });
});
