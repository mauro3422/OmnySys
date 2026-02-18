import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModifyOperation } from '#core/atomic-editor/operations/modify-operation.js';
import { InsertOperation } from '#core/atomic-editor/operations/insert-operation.js';
import { DeleteOperation } from '#core/atomic-editor/operations/delete-operation.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const createMockContext = (projectPath) => ({
  projectPath,
  orchestrator: {},
  emit: () => {},
  validators: {}
});

describe('ModifyOperation', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modify-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores filePath and options', () => {
      const operation = new ModifyOperation('src/test.js', {
        oldString: 'old',
        newString: 'new'
      }, createMockContext(tempDir));

      expect(operation.filePath).toBe('src/test.js');
      expect(operation.options.oldString).toBe('old');
      expect(operation.options.newString).toBe('new');
    });

    it('sets type to modify', () => {
      const operation = new ModifyOperation('src/test.js', {}, createMockContext(tempDir));

      expect(operation.type).toBe('modify');
    });
  });

  describe('validate()', () => {
    it('requires oldString', async () => {
      const operation = new ModifyOperation('src/test.js', {
        newString: 'new'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('oldString is required');
    });

    it('requires newString', async () => {
      const operation = new ModifyOperation('src/test.js', {
        oldString: 'old'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('newString is required');
    });

    it('validates oldString exists in file', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'const x = 1;', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'not found',
        newString: 'new'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('oldString not found');
    });

    it('detects multiple matches without all flag', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'foo foo foo', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'foo',
        newString: 'bar'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Multiple matches');
    });

    it('allows multiple matches with all flag', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'foo foo foo', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'foo',
        newString: 'bar',
        all: true
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(true);
    });

    it('handles file read errors', async () => {
      const operation = new ModifyOperation('src/nonexistent.js', {
        oldString: 'old',
        newString: 'new'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot read file');
    });
  });

  describe('execute()', () => {
    it('replaces oldString with newString', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'const old = 1;', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'old',
        newString: 'new'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('const new = 1;');
    });

    it('returns position of modification', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'line1\nline2\nconst old = 1;', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'old',
        newString: 'new'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      expect(result.position).toBeDefined();
      expect(result.position.line).toBe(3);
    });

    it('replaces all when all flag is set', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'foo bar foo baz foo', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'foo',
        newString: 'qux',
        all: true
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      expect(result.replacements).toBe(3);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('qux bar qux baz qux');
    });

    it('handles execution errors for non-existent file', async () => {
      const operation = new ModifyOperation('src/nonexistent.js', {
        oldString: 'old',
        newString: 'new'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(false);
    });
  });

  describe('undo()', () => {
    it('restores original content after modify', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'old code', 'utf-8');

      const operation = new ModifyOperation('src/test.js', {
        oldString: 'old',
        newString: 'new'
      }, createMockContext(tempDir));

      await operation.execute();
      const undoData = await operation.prepareUndo();
      await operation.undo(undoData);

      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('old code');
    });

    it('handles undo errors gracefully', async () => {
      const operation = new ModifyOperation('src/test.js', {}, createMockContext(tempDir));

      const result = await operation.undo({ content: 'original' });

      expect(result.success).toBe(false);
      expect(result.undone).toBe(false);
    });
  });
});

describe('InsertOperation', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'insert-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores filePath and options', () => {
      const operation = new InsertOperation('src/test.js', {
        content: 'new code',
        atLine: 5
      }, createMockContext(tempDir));

      expect(operation.filePath).toBe('src/test.js');
      expect(operation.options.content).toBe('new code');
      expect(operation.options.atLine).toBe(5);
    });

    it('sets type to insert', () => {
      const operation = new InsertOperation('src/test.js', {}, createMockContext(tempDir));

      expect(operation.type).toBe('insert');
    });
  });

  describe('validate()', () => {
    it('requires content', async () => {
      const operation = new InsertOperation('src/test.js', {}, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content is required');
    });

    it('allows only one position option', async () => {
      const operation = new InsertOperation('src/test.js', {
        content: 'code',
        atLine: 5,
        after: 'pattern'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only one position option');
    });

    it('validates after pattern exists', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'some content', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'code',
        after: 'pattern'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Pattern not found');
    });

    it('passes when after pattern exists', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'some pattern here', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'code',
        after: 'pattern'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(true);
    });
  });

  describe('execute()', () => {
    it('inserts at specific line', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'line1\nline2\nline3', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'inserted',
        atLine: 2
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('line1\ninserted\nline2\nline3');
    });

    it('inserts after pattern', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'start marker end', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'inserted',
        after: 'marker'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('start markerinserted end');
    });

    it('inserts before pattern', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'start marker end', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'inserted',
        before: 'marker'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('start insertedmarker end');
    });

    it('inserts at end by default', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'existing content', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'appended'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('existing content\nappended');
    });
  });

  describe('undo()', () => {
    it('restores original content after insert', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'original', 'utf-8');

      const operation = new InsertOperation('src/test.js', {
        content: 'new'
      }, createMockContext(tempDir));

      await operation.execute();
      const undoData = await operation.prepareUndo();
      const result = await operation.undo(undoData);

      expect(result.success).toBe(true);
      expect(result.undone).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('original');
    });
  });
});

describe('DeleteOperation', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'delete-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('stores filePath and options', () => {
      const operation = new DeleteOperation('src/test.js', {
        content: 'delete this',
        fromLine: 1,
        toLine: 5
      }, createMockContext(tempDir));

      expect(operation.filePath).toBe('src/test.js');
      expect(operation.options.content).toBe('delete this');
    });

    it('sets type to delete', () => {
      const operation = new DeleteOperation('src/test.js', {}, createMockContext(tempDir));

      expect(operation.type).toBe('delete');
    });
  });

  describe('validate()', () => {
    it('requires exactly one deletion method', async () => {
      const operation = new DeleteOperation('src/test.js', {}, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Exactly one deletion method');
    });

    it('rejects multiple deletion methods', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'line1\nline2', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        content: 'text',
        fromLine: 1
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
    });

    it('validates content exists', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'some content', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        content: 'not found'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content not found');
    });

    it('validates line range', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'line1\nline2\nline3', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        fromLine: 10
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid fromLine');
    });

    it('validates pattern regex', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'test.js'), 'some content', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        pattern: '[invalid'
      }, createMockContext(tempDir));

      const result = await operation.validate();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid regex pattern');
    });
  });

  describe('execute()', () => {
    it('deletes exact content', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'keep delete this keep', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        content: 'delete this '
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('keep keep');
    });

    it('deletes line range', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'line1\nline2\nline3\nline4\nline5', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        fromLine: 2,
        toLine: 3
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('line1\nline4\nline5');
    });

    it('deletes single line', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'line1\ntarget\nline3', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        fromLine: 2
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('line1\nline3');
    });

    it('deletes by pattern', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'foo bar baz', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        pattern: 'bar\\s*'
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('foo baz');
    });

    it('returns deleted content length', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'some content to delete', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        content: 'content to '
      }, createMockContext(tempDir));

      const result = await operation.execute();

      expect(result.success).toBe(true);
      expect(result.deletedLength).toBe('content to '.length);
    });
  });

  describe('undo()', () => {
    it('restores original content after delete', async () => {
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      const testFile = path.join(tempDir, 'src', 'test.js');
      await fs.writeFile(testFile, 'original content here', 'utf-8');

      const operation = new DeleteOperation('src/test.js', {
        content: 'content '
      }, createMockContext(tempDir));

      await operation.execute();
      const undoData = await operation.prepareUndo();
      const result = await operation.undo(undoData);

      expect(result.success).toBe(true);
      expect(result.undone).toBe(true);
      expect(result.restored).toBe('content ');
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('original content here');
    });
  });
});
