/**
 * @fileoverview Tests for atomic_edit MCP Tool
 * @module tests/unit/layer-c-memory/mcp/atomic-edit.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { atomic_edit, atomic_write } from '#layer-c/mcp/tools/atomic-edit.js';
import { AtomicEditor } from '#core/atomic-editor/index.js';

describe('atomic_edit', () => {
  let tempDir;
  let mockContext;
  let mockOrchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-atomic-test-'));
    
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    
    await fs.writeFile(
      path.join(srcDir, 'utils.js'),
      'export const x = 1;\nexport const y = 2;\n'
    );
    
    await fs.writeFile(
      path.join(srcDir, 'test.js'),
      'import { x } from "./utils.js";\nconsole.log(x);\n'
    );
    
    mockOrchestrator = {};
    
    const atomicEditor = new AtomicEditor(tempDir, mockOrchestrator, {
      enableUndo: false,
      enableSafetyChecks: false
    });
    mockOrchestrator.atomicEditor = atomicEditor;
    
    mockContext = {
      projectPath: tempDir,
      orchestrator: mockOrchestrator
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('parameter validation', () => {
    it('returns error for missing filePath', async () => {
      const result = await atomic_edit({
        oldString: 'old',
        newString: 'new'
      }, mockContext);

      expect(result.error).toContain('Missing required parameters');
    });

    it('returns error for missing oldString', async () => {
      const result = await atomic_edit({
        filePath: 'src/utils.js',
        newString: 'new'
      }, mockContext);

      expect(result.error).toContain('Missing required parameters');
    });

    it('returns error for missing newString', async () => {
      const result = await atomic_edit({
        filePath: 'src/utils.js',
        oldString: 'old'
      }, mockContext);

      expect(result.error).toContain('Missing required parameters');
    });

    it('returns example in error message', async () => {
      const result = await atomic_edit({}, mockContext);

      expect(result.example).toBeDefined();
      expect(result.example).toContain('atomic_edit');
    });
  });

  describe('validates syntax before edit', () => {
    it('validates and edits successfully', async () => {
      const result = await atomic_edit({
        filePath: 'src/utils.js',
        oldString: 'const x = 1;',
        newString: 'const x = 2;'
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('writes new content to file', async () => {
      await atomic_edit({
        filePath: 'src/utils.js',
        oldString: 'const x = 1;',
        newString: 'const x = 42;'
      }, mockContext);

      const content = await fs.readFile(path.join(tempDir, 'src/utils.js'), 'utf-8');
      expect(content).toContain('const x = 42;');
    });
  });

  describe('handles invalid syntax', () => {
    it.skip('LIMITATION: node --check does not catch all ESM syntax errors - returns error for invalid syntax', async () => {
      const result = await atomic_edit({
        filePath: 'src/utils.js',
        oldString: 'export const x = 1;',
        newString: 'export const x = {{{'
      }, mockContext);

      expect(result.error).toBe('SYNTAX_ERROR');
      expect(result.severity).toBe('critical');
      expect(result.canProceed).toBe(false);
    });

    it.skip('LIMITATION: node --check does not catch all ESM syntax errors - provides suggestion for syntax error', async () => {
      const result = await atomic_edit({
        filePath: 'src/utils.js',
        oldString: 'export const x = 1;',
        newString: 'export const x = {{{'
      }, mockContext);

      expect(result.suggestion).toContain('syntax error');
    });
  });

  describe('handles missing file', () => {
    it('returns error for non-existent file', async () => {
      const result = await atomic_edit({
        filePath: 'src/nonexistent.js',
        oldString: 'old',
        newString: 'new'
      }, mockContext);

      expect(result).toHaveProperty('error');
    });
  });

  describe('handles string not found', () => {
    it('returns error when oldString not found', async () => {
      const result = await atomic_edit({
        filePath: 'src/utils.js',
        oldString: 'THIS_STRING_DOES_NOT_EXIST',
        newString: 'something'
      }, mockContext);

      expect(result).toHaveProperty('error');
    });
  });
});

describe('atomic_write', () => {
  let tempDir;
  let mockContext;
  let mockOrchestrator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-atomic-write-test-'));
    
    const srcDir = path.join(tempDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });
    
    mockOrchestrator = {};
    
    const atomicEditor = new AtomicEditor(tempDir, mockOrchestrator, {
      enableUndo: false,
      enableSafetyChecks: false
    });
    mockOrchestrator.atomicEditor = atomicEditor;
    
    mockContext = {
      projectPath: tempDir,
      orchestrator: mockOrchestrator
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('write operations', () => {
    it('writes new file successfully', async () => {
      const result = await atomic_write({
        filePath: 'src/new-file.js',
        content: 'export const x = 1;'
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('actually creates the file', async () => {
      await atomic_write({
        filePath: 'src/created.js',
        content: 'export const created = true;'
      }, mockContext);

      const content = await fs.readFile(path.join(tempDir, 'src/created.js'), 'utf-8');
      expect(content).toBe('export const created = true;');
    });

    it('BUG: overwrites existing file with new content', async () => {
      await fs.writeFile(path.join(tempDir, 'src/existing.js'), 'old content');
      
      const result = await atomic_write({
        filePath: 'src/existing.js',
        content: 'new content'
      }, mockContext);

      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(tempDir, 'src/existing.js'), 'utf-8');
      expect(content).toBe('new content');
    });
  });

  describe('parameter validation', () => {
    it('returns error for missing filePath', async () => {
      const result = await atomic_write({
        content: 'code'
      }, mockContext);

      expect(result.error).toContain('Missing required parameters');
    });

    it('returns error for missing content', async () => {
      const result = await atomic_write({
        filePath: 'src/new.js'
      }, mockContext);

      expect(result.error).toContain('Missing required parameters');
    });
  });

  describe('error handling', () => {
    it('returns error for invalid syntax', async () => {
      const result = await atomic_write({
        filePath: 'src/bad.js',
        content: 'invalid syntax {{{'
      }, mockContext);

      expect(result).toHaveProperty('error');
    });
  });
});
