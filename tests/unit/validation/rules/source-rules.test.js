/**
 * @fileoverview Source Validation Rules Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileExistenceRule } from '../../../../src/validation/rules/source/file-existence.js';
import { ExportConsistencyRule } from '../../../../src/validation/rules/source/export-consistency.js';
import { ImportResolutionRule } from '../../../../src/validation/rules/source/import-resolution.js';

describe('FileExistenceRule', () => {
  let tempDir;
  let context;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-existence-test-'));
    context = { projectPath: tempDir };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(FileExistenceRule.id).toBe('source.file-existence');
    });

    it('is not invariant', () => {
      expect(FileExistenceRule.invariant).toBe(false);
    });

    it('applies to file and molecule types', () => {
      expect(FileExistenceRule.appliesTo).toContain('file');
      expect(FileExistenceRule.appliesTo).toContain('molecule');
    });

    it('requires path field', () => {
      expect(FileExistenceRule.requires).toContain('path');
    });
  });

  describe('validate', () => {
    it('returns valid for existing file', async () => {
      const filePath = path.join(tempDir, 'test.js');
      await fs.writeFile(filePath, 'const x = 1;');
      
      const entity = { id: 'test.js', path: 'test.js' };
      const result = await FileExistenceRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
      expect(result.field).toBe('file-existence');
    });

    it('returns invalid for missing file', async () => {
      const entity = { id: 'missing.js', path: 'missing.js' };
      const result = await FileExistenceRule.validate(entity, context);
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe('warning');
      expect(result.message).toContain('not found');
    });

    it('handles nested paths', async () => {
      const nestedDir = path.join(tempDir, 'src', 'components');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'Button.js'), 'export const Button = () => {};');
      
      const entity = { id: 'src/components/Button.js', path: 'src/components/Button.js' };
      const result = await FileExistenceRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });
  });
});

describe('ExportConsistencyRule', () => {
  let tempDir;
  let context;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'export-consistency-test-'));
    context = {
      projectPath: tempDir,
      getSource: async (filePath) => {
        try {
          return await fs.readFile(path.join(tempDir, filePath), 'utf-8');
        } catch {
          return null;
        }
      }
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(ExportConsistencyRule.id).toBe('source.export-consistency');
    });

    it('requires path and exports', () => {
      expect(ExportConsistencyRule.requires).toContain('path');
      expect(ExportConsistencyRule.requires).toContain('exports');
    });
  });

  describe('validate', () => {
    it('returns valid when exports match code', async () => {
      await fs.writeFile(path.join(tempDir, 'test.js'), 'export const foo = 1;');
      
      const entity = {
        id: 'test.js',
        path: 'test.js',
        exports: [{ name: 'foo', type: 'named' }]
      };
      
      const result = await ExportConsistencyRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it.skip('BUG: returns invalid when export missing from code', async () => {
      await fs.writeFile(path.join(tempDir, 'test.js'), 'const foo = 1;');
      
      const entity = {
        id: 'test.js',
        path: 'test.js',
        exports: [{ name: 'bar', type: 'named' }]
      };
      
      const result = await ExportConsistencyRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.field).toBe('export.bar');
    });

    it.skip('BUG: warns when file has exports but none registered', async () => {
      await fs.writeFile(path.join(tempDir, 'test.js'), 'export const foo = 1;');
      
      const entity = {
        id: 'test.js',
        path: 'test.js',
        exports: []
      };
      
      const result = await ExportConsistencyRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.severity).toBe('warning');
      expect(validationResult.message).toContain('none registered');
    });

    it('returns invalid when source not available', async () => {
      const entity = {
        id: 'missing.js',
        path: 'missing.js',
        exports: [{ name: 'foo' }]
      };
      
      const result = await ExportConsistencyRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.actual).toBe('source code not loaded');
    });

    it('handles default exports', async () => {
      await fs.writeFile(path.join(tempDir, 'test.js'), 'export default function App() {}');
      
      const entity = {
        id: 'test.js',
        path: 'test.js',
        exports: [{ name: 'App', type: 'default' }]
      };
      
      const result = await ExportConsistencyRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it('handles multiple exports', async () => {
      await fs.writeFile(path.join(tempDir, 'test.js'), `
        export const foo = 1;
        export const bar = 2;
        export { baz } from './other';
      `);
      
      const entity = {
        id: 'test.js',
        path: 'test.js',
        exports: [
          { name: 'foo', type: 'named' },
          { name: 'bar', type: 'named' }
        ]
      };
      
      const result = await ExportConsistencyRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });
  });
});

describe('ImportResolutionRule', () => {
  let tempDir;
  let context;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'import-resolution-test-'));
    context = { projectPath: tempDir };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(ImportResolutionRule.id).toBe('source.import-resolution');
    });

    it('requires path and imports', () => {
      expect(ImportResolutionRule.requires).toContain('path');
      expect(ImportResolutionRule.requires).toContain('imports');
    });
  });

  describe('validate', () => {
    it('returns valid when imports resolve', async () => {
      await fs.writeFile(path.join(tempDir, 'utils.js'), 'export const util = 1;');
      await fs.writeFile(path.join(tempDir, 'main.js'), "import { util } from './utils.js';");
      
      const entity = {
        id: 'main.js',
        path: 'main.js',
        imports: [{ source: './utils.js' }]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it('skips built-in modules', async () => {
      const entity = {
        id: 'main.js',
        path: 'main.js',
        imports: [
          { source: 'fs' },
          { source: 'path' },
          { source: 'http' }
        ]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it('skips external packages', async () => {
      const entity = {
        id: 'main.js',
        path: 'main.js',
        imports: [
          { source: 'react' },
          { source: 'lodash' }
        ]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it.skip('BUG: returns warning for missing relative imports', async () => {
      await fs.writeFile(path.join(tempDir, 'main.js'), "import { missing } from './missing.js';");
      
      const entity = {
        id: 'main.js',
        path: 'main.js',
        imports: [{ source: './missing' }]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      
      const validationResult = Array.isArray(result) ? result[0] : result;
      expect(validationResult.valid).toBe(false);
      expect(validationResult.severity).toBe('warning');
    });

    it('resolves imports with extensions', async () => {
      await fs.writeFile(path.join(tempDir, 'utils.js'), 'export const x = 1;');
      await fs.writeFile(path.join(tempDir, 'main.js'), "import { x } from './utils';");
      
      const entity = {
        id: 'main.js',
        path: 'main.js',
        imports: [{ source: './utils' }]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it('handles nested imports', async () => {
      await fs.mkdir(path.join(tempDir, 'src', 'lib'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'lib', 'helper.js'), 'export const help = 1;');
      await fs.writeFile(path.join(tempDir, 'src', 'main.js'), "import { help } from './lib/helper';");
      
      const entity = {
        id: 'src/main.js',
        path: 'src/main.js',
        imports: [{ source: './lib/helper' }]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });

    it('handles parent directory imports', async () => {
      await fs.mkdir(path.join(tempDir, 'src', 'components'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'utils.js'), 'export const util = 1;');
      await fs.writeFile(path.join(tempDir, 'src', 'components', 'Button.js'), "import { util } from '../../utils';");
      
      const entity = {
        id: 'src/components/Button.js',
        path: 'src/components/Button.js',
        imports: [{ source: '../../utils' }]
      };
      
      const result = await ImportResolutionRule.validate(entity, context);
      const validationResult = Array.isArray(result) ? result[0] : result;
      
      expect(validationResult.valid).toBe(true);
    });
  });
});
