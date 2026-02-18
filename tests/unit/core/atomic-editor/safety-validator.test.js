import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SafetyValidator } from '#core/atomic-editor/validators/safety-validator.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SafetyValidator', () => {
  let validator;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'safety-test-'));
    validator = new SafetyValidator(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores project path', () => {
      expect(validator.projectPath).toBe(tempDir);
    });

    it('sets default options', () => {
      expect(validator.options.allowOutsideProject).toBe(false);
      expect(validator.options.protectedPatterns).toEqual([]);
    });

    it('accepts custom options', () => {
      const custom = new SafetyValidator(tempDir, {
        allowOutsideProject: true,
        protectedPatterns: ['*.env']
      });
      expect(custom.options.allowOutsideProject).toBe(true);
      expect(custom.options.protectedPatterns).toEqual(['*.env']);
    });
  });

  describe('validateEdit', () => {
    it('returns safe:true for valid file in project', async () => {
      const testFile = path.join(tempDir, 'test.js');
      await fs.writeFile(testFile, 'const x = 1;');

      const result = await validator.validateEdit('test.js', {
        oldString: 'x = 1',
        newString: 'x = 2'
      });

      expect(result.safe).toBe(true);
      expect(result.checks).toContain('path');
      expect(result.checks).toContain('file_exists');
    });

    it('returns safe:false for path outside project', async () => {
      const result = await validator.validateEdit('../../../etc/passwd', {
        oldString: 'old',
        newString: 'new'
      });

      expect(result.safe).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('outside project');
    });

    it('returns safe:false for non-existent file', async () => {
      const result = await validator.validateEdit('nonexistent.js', {
        oldString: 'old',
        newString: 'new'
      });

      expect(result.safe).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('skips file exists check for new files', async () => {
      const result = await validator.validateEdit('brand-new.js', {
        isNewFile: true,
        newString: 'content'
      });

      expect(result.safe).toBe(true);
      expect(result.checks).not.toContain('file_exists');
    });
  });

  describe('protected patterns', () => {
    it('blocks files matching protected pattern', async () => {
      const protectedValidator = new SafetyValidator(tempDir, {
        protectedPatterns: ['*.env', 'config/*']
      });

      const testFile = path.join(tempDir, '.env');
      await fs.writeFile(testFile, 'KEY=value');

      const result = await protectedValidator.validateEdit('.env', {
        oldString: 'KEY=value',
        newString: 'KEY=new'
      });

      expect(result.safe).toBe(false);
      expect(result.error).toContain('protected pattern');
    });

    it('allows files not matching protected patterns', async () => {
      const protectedValidator = new SafetyValidator(tempDir, {
        protectedPatterns: ['*.env']
      });

      const testFile = path.join(tempDir, 'app.js');
      await fs.writeFile(testFile, 'console.log("hi")');

      const result = await protectedValidator.validateEdit('app.js', {
        oldString: 'hi',
        newString: 'hello'
      });

      expect(result.safe).toBe(true);
    });
  });

  describe('content validation', () => {
    it('warns about eval usage', async () => {
      const testFile = path.join(tempDir, 'test.js');
      await fs.writeFile(testFile, 'const x = 1;');

      const result = await validator.validateEdit('test.js', {
        oldString: 'x = 1',
        newString: 'eval("dangerous")'
      });

      expect(result.safe).toBe(true);
      expect(result.warning).toContain('eval');
    });

    it('warns about large content additions', async () => {
      const testFile = path.join(tempDir, 'test.js');
      await fs.writeFile(testFile, 'const x = 1;');

      const largeContent = 'x'.repeat(150000);
      const result = await validator.validateEdit('test.js', {
        oldString: 'x = 1',
        newString: largeContent
      });

      expect(result.safe).toBe(true);
      expect(result.warning).toContain('Large content');
    });

    it('warns about empty replacement', async () => {
      const testFile = path.join(tempDir, 'test.js');
      await fs.writeFile(testFile, 'const x = 1;');

      const result = await validator.validateEdit('test.js', {
        oldString: 'x = 1',
        newString: ''
      });

      expect(result.safe).toBe(true);
      expect(result.warning).toContain('empty');
    });
  });

  describe('allowOutsideProject option', () => {
    it('allows outside paths when enabled', async () => {
      const permissiveValidator = new SafetyValidator(tempDir, {
        allowOutsideProject: true
      });

      const result = await permissiveValidator.validateEdit('../outside.js', {
        isNewFile: true,
        oldString: '',
        newString: 'content'
      });

      expect(result.safe).toBe(true);
    });
  });

  describe('validateWrite', () => {
    it('validates write as new file operation', async () => {
      const result = await validator.validateWrite('new-file.js', 'content');

      expect(result.safe).toBe(true);
    });

    it('still blocks outside paths for writes', async () => {
      const result = await validator.validateWrite('../../../etc/malicious', 'bad');

      expect(result.safe).toBe(false);
      expect(result.error).toContain('outside project');
    });
  });
});
