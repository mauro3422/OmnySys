import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AtomicEditor } from '#core/atomic-editor/AtomicEditor.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('AtomicEditor', () => {
  let editor;
  let tempDir;
  let testFile;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-editor-test-'));
    testFile = path.join(tempDir, 'test.js');
    await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\n');
    
    editor = new AtomicEditor(tempDir, null, {
      enableUndo: true,
      enableSafetyChecks: true,
      enableSyntaxValidation: true
    });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores project path', () => {
      expect(editor.projectPath).toBe(tempDir);
    });

    it('initializes validators', () => {
      expect(editor.syntaxValidator).toBeDefined();
      expect(editor.safetyValidator).toBeDefined();
    });

    it('initializes history manager', () => {
      expect(editor.history).toBeDefined();
    });

    it('accepts custom options', () => {
      const custom = new AtomicEditor(tempDir, null, {
        enableUndo: false,
        maxHistorySize: 10
      });
      expect(custom.options.enableUndo).toBe(false);
    });
  });

  describe('edit()', () => {
    it('edits file successfully', async () => {
      const result = await editor.edit('test.js', 'const x = 1;', 'const x = 100;');
      expect(result.success).toBe(true);
    });

    it('preserves other content when editing', async () => {
      await editor.edit('test.js', 'const x = 1;', 'const x = 999;');
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toContain('const y = 2;');
    });

    it('fails for non-existent old string', async () => {
      await expect(
        editor.edit('test.js', 'nonexistent', 'new')
      ).rejects.toThrow();
    });

    it('fails for non-existent file', async () => {
      await expect(
        editor.edit('missing.js', 'old', 'new')
      ).rejects.toThrow();
    });

    it('emits atom:modified event on edit', async () => {
      let eventFired = false;
      editor.on('atom:modified', () => { eventFired = true; });
      await editor.edit('test.js', 'const x = 1;', 'const x = 10;');
      expect(eventFired).toBe(true);
    });

    it('fails for invalid syntax in new string', async () => {
      await expect(
        editor.edit('test.js', 'const x = 1;', 'const x = {')
      ).rejects.toThrow();
    });
  });

  describe('write()', () => {
    it('creates new file', async () => {
      const result = await editor.write('new-file.js', 'console.log("hello");');
      expect(result.success).toBe(true);
      
      const exists = await fs.access(path.join(tempDir, 'new-file.js')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('writes correct content', async () => {
      await editor.write('new-file.js', 'const hello = "world";');
      const content = await fs.readFile(path.join(tempDir, 'new-file.js'), 'utf-8');
      expect(content).toBe('const hello = "world";');
    });

    it('fails for invalid syntax', async () => {
      await expect(
        editor.write('bad.js', 'const x = {')
      ).rejects.toThrow();
    });

    it('fails for path outside project', async () => {
      await expect(
        editor.write('../../../etc/malicious.js', 'bad code')
      ).rejects.toThrow();
    });

    it('emits atom:created event', async () => {
      let eventFired = false;
      editor.on('atom:created', () => { eventFired = true; });
      await editor.write('created.js', 'const x = 1;');
      expect(eventFired).toBe(true);
    });
  });

  describe('undo()', () => {
    it('undoes edit successfully', async () => {
      await editor.edit('test.js', 'const x = 1;', 'const x = 999;');
      const result = await editor.undo();
      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toContain('const x = 1;');
    });

    it('returns failure when nothing to undo', async () => {
      const result = await editor.undo();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Nothing to undo');
    });
  });

  describe('redo()', () => {
    it('redoes edit successfully', async () => {
      await editor.edit('test.js', 'const x = 1;', 'const x = 999;');
      await editor.undo();
      const result = await editor.redo();
      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toContain('const x = 999;');
    });

    it('returns failure when nothing to redo', async () => {
      const result = await editor.redo();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Nothing to redo');
    });
  });

  describe('getHistoryInfo()', () => {
    it('returns empty history initially', async () => {
      const info = editor.getHistoryInfo();
      expect(info.canUndo).toBe(false);
    });

    it('shows canUndo after edit', async () => {
      await editor.edit('test.js', 'const x = 1;', 'const x = 10;');
      const info = editor.getHistoryInfo();
      expect(info.canUndo).toBe(true);
    });
  });

  describe('insert()', () => {
    it('inserts content successfully', async () => {
      const result = await editor.insert('test.js', {
        content: '// inserted comment\n',
        atLine: 1
      });
      expect(result.success).toBe(true);
    });
  });

  describe('delete()', () => {
    it('deletes content successfully', async () => {
      const result = await editor.delete('test.js', {
        content: 'const x = 1;\n'
      });
      expect(result.success).toBe(true);
    });
  });
});
