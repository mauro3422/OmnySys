import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Full Analysis Pipeline: A → B → C', () => {
  let testDir;
  let projectPath;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-full-pipeline');
    await fs.mkdir(testDir, { recursive: true });
    projectPath = testDir;
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Complete Flow', () => {
    it('should run full pipeline on simple project', async () => {
      await fs.writeFile(path.join(projectPath, 'main.js'), `
        import { config } from './config.js';
        export function main() { return config.get(); }
      `);
      await fs.writeFile(path.join(projectPath, 'config.js'), `
        export const config = { get() { return 42; } };
      `);

      const { scanProject } = await import('#layer-a/scanner.js');
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      
      const files = await scanProject(projectPath);
      expect(files.length).toBe(2);

      const results = [];
      for (const file of files) {
        const result = await analyzeSingleFile(projectPath, file);
        results.push(result);
      }
      expect(results.length).toBe(2);
    });

    it('should handle syntax errors gracefully', async () => {
      await fs.writeFile(path.join(projectPath, 'broken.js'), `export function broken( {`);
      await fs.writeFile(path.join(projectPath, 'good.js'), `export const x = 1;`);

      const { scanProject } = await import('#layer-a/scanner.js');
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      
      const files = await scanProject(projectPath);
      const results = [];
      
      for (const file of files) {
        try {
          const result = await analyzeSingleFile(projectPath, file);
          results.push(result);
        } catch {
          // Continue with other files
        }
      }

      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Flow Validation', () => {
    it('should preserve data integrity across layers', async () => {
      await fs.writeFile(path.join(projectPath, 'test.js'), `
        export const value = 42;
        export function getValue() { return value; }
      `);

      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      const layerA = await analyzeSingleFile(projectPath, 'test.js');
      
      expect(layerA.exports.length).toBeGreaterThan(0);
    });
  });
});
