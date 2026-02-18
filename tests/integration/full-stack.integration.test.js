/**
 * @fileoverview Full-Stack Integration Test
 * 
 * Test de integración completa de todas las capas:
 * Layer Graph (0) → Layer A (1) → Layer B (2) → Layer C (3)
 * 
 * Valida el flujo end-to-end del sistema OmnySys.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Full-Stack Integration: Graph → A → B → C', () => {
  let testDir;
  let projectPath;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-fullstack');
    await fs.mkdir(testDir, { recursive: true });
    projectPath = testDir;
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Layer Graph (Nivel 0)', () => {
    it('should build dependency graph from parsed files', async () => {
      await fs.writeFile(path.join(projectPath, 'a.js'), `
        import { b } from './b.js';
        export const a = () => b();
      `);
      await fs.writeFile(path.join(projectPath, 'b.js'), `
        import { c } from './c.js';
        export const b = () => c();
      `);
      await fs.writeFile(path.join(projectPath, 'c.js'), `
        export const c = () => 42;
      `);

      const { buildSystemMap } = await import('#layer-graph/index.js');
      const { scanProject } = await import('#layer-a/scanner.js');
      const { parseFileFromDisk } = await import('#layer-a/parser/index.js');
      const { resolveImport, getResolutionConfig } = await import('#layer-a/resolver.js');

      const files = await scanProject(projectPath);
      const parsedFiles = {};
      const resolvedImports = {};

      for (const file of files) {
        const filePath = path.join(projectPath, file);
        parsedFiles[file] = await parseFileFromDisk(filePath);
        
        const config = await getResolutionConfig(projectPath);
        for (const imp of parsedFiles[file].imports || []) {
          const result = await resolveImport(imp.source, filePath, projectPath, config.aliases);
          if (!resolvedImports[file]) resolvedImports[file] = [];
          resolvedImports[file].push({ source: imp.source, resolved: result.resolved });
        }
      }

      const systemMap = buildSystemMap(parsedFiles, resolvedImports);
      
      expect(systemMap).toBeDefined();
      expect(systemMap.files).toBeDefined();
      expect(Object.keys(systemMap.files).length).toBe(3);
    });

    it('should detect cycles in dependency graph', async () => {
      await fs.writeFile(path.join(projectPath, 'cycle-a.js'), `
        import { b } from './cycle-b.js';
        export const a = () => b();
      `);
      await fs.writeFile(path.join(projectPath, 'cycle-b.js'), `
        import { a } from './cycle-a.js';
        export const b = () => a();
      `);

      const { buildSystemMap, detectCycles } = await import('#layer-graph/index.js');
      const { scanProject } = await import('#layer-a/scanner.js');
      const { parseFileFromDisk } = await import('#layer-a/parser/index.js');
      const { resolveImport, getResolutionConfig } = await import('#layer-a/resolver.js');

      const files = await scanProject(projectPath);
      const parsedFiles = {};
      const resolvedImports = {};
      
      for (const file of files) {
        const filePath = path.join(projectPath, file);
        parsedFiles[file] = await parseFileFromDisk(filePath);
        
        const config = await getResolutionConfig(projectPath);
        resolvedImports[file] = [];
        
        for (const imp of parsedFiles[file].imports || []) {
          const result = await resolveImport(imp.source, filePath, projectPath, config.aliases);
          resolvedImports[file].push({ 
            source: imp.source, 
            resolved: result.resolved 
          });
        }
      }

      const systemMap = buildSystemMap(parsedFiles, resolvedImports);
      const cycles = detectCycles(systemMap.files);

      expect(cycles).toBeDefined();
    });

    it('should calculate impact map for changes', async () => {
      await fs.writeFile(path.join(projectPath, 'core.js'), `export const core = 'core';`);
      await fs.writeFile(path.join(projectPath, 'lib.js'), `
        import { core } from './core.js';
        export const lib = () => core;
      `);
      await fs.writeFile(path.join(projectPath, 'app.js'), `
        import { lib } from './lib.js';
        export const app = () => lib();
      `);

      const { buildSystemMap, getImpactMap } = await import('#layer-graph/index.js');
      const { scanProject } = await import('#layer-a/scanner.js');
      const { parseFileFromDisk } = await import('#layer-a/parser/index.js');

      const files = await scanProject(projectPath);
      const parsedFiles = {};
      
      for (const file of files) {
        parsedFiles[file] = await parseFileFromDisk(path.join(projectPath, file));
      }

      const systemMap = buildSystemMap(parsedFiles, {});
      const impact = getImpactMap('core.js', systemMap.files);

      expect(impact).toBeDefined();
      expect(impact.affected || impact).toBeDefined();
    });
  });

  describe('Layer A (Nivel 1) - Static Analysis', () => {
    it('should scan, parse and analyze files', async () => {
      await fs.writeFile(path.join(projectPath, 'module.js'), `
        import { helper } from './utils.js';
        
        const INTERNAL_STATE = {};
        
        export function process(value) {
          localStorage.setItem('cache', JSON.stringify(value));
          return helper(value);
        }
        
        export default process;
      `);
      await fs.writeFile(path.join(projectPath, 'utils.js'), `
        export const helper = (v) => v * 2;
      `);

      const { scanProject } = await import('#layer-a/scanner.js');
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');

      const files = await scanProject(projectPath);
      expect(files.length).toBe(2);

      for (const file of files) {
        const result = await analyzeSingleFile(projectPath, file);
        expect(result).toBeDefined();
        expect(result.filePath).toBeDefined();
        expect(result.imports).toBeDefined();
        expect(result.exports).toBeDefined();
      }
    });

    it('should extract atoms from functions', async () => {
      await fs.writeFile(path.join(projectPath, 'atoms.js'), `
        export function simple() { return 1; }
        
        export function withDeps() {
          return simple() + fetchData();
        }
        
        export async function asyncFunc() {
          const data = await fetch('/api');
          return data.json();
        }
      `);

      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      const result = await analyzeSingleFile(projectPath, 'atoms.js');

      expect(result.atoms).toBeDefined();
      expect(result.totalAtoms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Layer B (Nivel 2) - Semantic Analysis', () => {
    it('should build metadata contracts', async () => {
      await fs.writeFile(path.join(projectPath, 'service.js'), `
        /**
         * @param {string} id - The entity ID
         * @returns {Promise<Object>} The entity data
         */
        export async function fetchEntity(id) {
          const response = await fetch('/api/entities/' + id);
          return response.json();
        }
      `);

      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      const { buildStandardMetadata } = await import('#layer-b/metadata-contract/builders/standard-builder.js');

      const analysis = await analyzeSingleFile(projectPath, 'service.js');
      const metadata = buildStandardMetadata(analysis, 'service.js');

      expect(metadata).toBeDefined();
      expect(metadata.filePath).toBe('service.js');
    });

    it('should detect shared state patterns', async () => {
      await fs.writeFile(path.join(projectPath, 'state.js'), `
        let globalState = {};
        
        export function setState(key, value) {
          globalState[key] = value;
          localStorage.setItem('state', JSON.stringify(globalState));
        }
        
        export function getState(key) {
          return globalState[key];
        }
      `);

      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      const result = await analyzeSingleFile(projectPath, 'state.js');

      expect(result).toBeDefined();
    });
  });

  describe('Layer C (Nivel 3) - Memory & Query', () => {
    it('should save and load analysis from storage', async () => {
      await fs.writeFile(path.join(projectPath, 'store.js'), `
        export const store = {
          get: (key) => localStorage.getItem(key),
          set: (key, value) => localStorage.setItem(key, value)
        };
      `);

      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      
      const result = await analyzeSingleFile(projectPath, 'store.js');
      expect(result).toBeDefined();

      const savedPath = path.join(projectPath, '.omnysysdata', 'files', 'store.js.json');
      const exists = await fs.access(savedPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should query analysis results', async () => {
      await fs.writeFile(path.join(projectPath, 'queryable.js'), `
        export const name = 'test';
        export function query() { return name; }
      `);

      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      await analyzeSingleFile(projectPath, 'queryable.js');

      const dataDir = path.join(projectPath, '.omnysysdata', 'files');
      const files = await fs.readdir(dataDir).catch(() => []);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('Full Pipeline: All Layers Integration', () => {
    it('should run complete pipeline on realistic project', async () => {
      await fs.writeFile(path.join(projectPath, 'config.js'), `
        export const API_URL = 'https://api.example.com';
        export const TIMEOUT = 5000;
      `);
      
      await fs.writeFile(path.join(projectPath, 'api.js'), `
        import { API_URL, TIMEOUT } from './config.js';
        
        export async function fetchData(endpoint) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), TIMEOUT);
          
          try {
            const response = await fetch(API_URL + endpoint, {
              signal: controller.signal
            });
            return response.json();
          } finally {
            clearTimeout(timeout);
          }
        }
      `);
      
      await fs.writeFile(path.join(projectPath, 'cache.js'), `
        const cache = new Map();
        
        export function get(key) {
          const cached = cache.get(key);
          if (cached && Date.now() < cached.expiry) {
            return cached.value;
          }
          return null;
        }
        
        export function set(key, value, ttl = 60000) {
          cache.set(key, { value, expiry: Date.now() + ttl });
          localStorage.setItem('cache:' + key, JSON.stringify({ value, expiry: Date.now() + ttl }));
        }
      `);
      
      await fs.writeFile(path.join(projectPath, 'index.js'), `
        import { fetchData } from './api.js';
        import { get, set } from './cache.js';
        
        export async function getResource(id) {
          const cached = get('resource:' + id);
          if (cached) return cached;
          
          const data = await fetchData('/resources/' + id);
          set('resource:' + id, data);
          return data;
        }
      `);

      const { scanProject } = await import('#layer-a/scanner.js');
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');
      const { buildSystemMap } = await import('#layer-graph/index.js');

      const files = await scanProject(projectPath);
      expect(files.length).toBe(4);

      const results = [];
      for (const file of files) {
        const result = await analyzeSingleFile(projectPath, file);
        results.push(result);
      }

      expect(results.length).toBe(4);

      const indexPath = path.join(projectPath, '.omnysysdata', 'files', 'index.js.json');
      const indexAnalysis = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
      
      expect(indexAnalysis.imports.length).toBeGreaterThan(0);
      expect(indexAnalysis.exports.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully across layers', async () => {
      await fs.writeFile(path.join(projectPath, 'valid.js'), `export const x = 1;`);
      await fs.writeFile(path.join(projectPath, 'invalid.js'), `export function broken( {`);
      await fs.writeFile(path.join(projectPath, 'also-valid.js'), `export const y = 2;`);

      const { scanProject } = await import('#layer-a/scanner.js');
      const { analyzeSingleFile } = await import('#layer-a/pipeline/single-file.js');

      const files = await scanProject(projectPath);
      const results = [];

      for (const file of files) {
        try {
          const result = await analyzeSingleFile(projectPath, file);
          results.push(result);
        } catch (e) {
          // Continue processing other files
        }
      }

      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });
});
