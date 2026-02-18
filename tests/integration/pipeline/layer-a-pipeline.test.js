import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { scanProject } from '#layer-a/scanner.js';
import { parseFile } from '#layer-a/parser/index.js';
import { analyzeSingleFile } from '#layer-a/pipeline/single-file.js';

describe('Layer A Pipeline', () => {
  let testDir;
  let projectPath;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-layer-a-pipeline');
    await fs.mkdir(testDir, { recursive: true });
    projectPath = testDir;
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Scan Phase', () => {
    it('should scan empty project', async () => {
      const files = await scanProject(projectPath);
      expect(files).toEqual([]);
    });

    it('should scan project with JS files', async () => {
      await fs.writeFile(path.join(projectPath, 'index.js'), 'export const x = 1;');
      await fs.writeFile(path.join(projectPath, 'utils.js'), 'export const helper = () => {};');

      const files = await scanProject(projectPath);
      expect(files.length).toBe(2);
      expect(files.map(f => path.basename(f)).sort()).toEqual(['index.js', 'utils.js']);
    });
  });

  describe('Parse Phase', () => {
    it('should parse simple function', async () => {
      const code = `export function add(a, b) { return a + b; }`;
      const result = await parseFile(code, 'test.js');
      expect(result).toBeDefined();
    });

    it('should parse imports', async () => {
      const code = `import { useState } from 'react'; import * as utils from './utils';`;
      const result = await parseFile(code, 'test.js');
      expect(result.imports).toBeDefined();
    });
  });

  describe('Analyze Phase', () => {
    it('should analyze single file', async () => {
      await fs.writeFile(path.join(projectPath, 'test.js'), `
        import { helper } from './utils.js';
        export function main() { return helper(); }
      `);

      const result = await analyzeSingleFile(projectPath, 'test.js');
      expect(result.filePath).toBeDefined();
      expect(result.imports).toBeDefined();
    });

    it('should detect localStorage usage', async () => {
      await fs.writeFile(path.join(projectPath, 'storage.js'), `
        export function saveToken(token) {
          localStorage.setItem('token', token);
        }
      `);

      const result = await analyzeSingleFile(projectPath, 'storage.js');
      expect(result).toBeDefined();
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should run complete pipeline on multi-file project', async () => {
      await fs.writeFile(path.join(projectPath, 'index.js'), `
        import { helper } from './utils.js';
        export function main() { return helper(); }
      `);
      await fs.writeFile(path.join(projectPath, 'utils.js'), `
        export function helper() { return 42; }
      `);

      const files = await scanProject(projectPath);
      expect(files.length).toBe(2);

      const results = [];
      for (const file of files) {
        const result = await analyzeSingleFile(projectPath, file);
        results.push(result);
      }
      expect(results.length).toBe(2);
    });
  });
});
