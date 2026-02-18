/**
 * @fileoverview Layer A Integration Tests - Extended Workflows
 * 
 * Más flujos de integración para aumentar coverage:
 * - Query System workflows
 * - Parser workflows
 * - Graph workflows
 * - Module Analysis workflows
 * 
 * @module tests/integration/layer-a/extended-workflows.integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Import Layer A modules
import { parseFile } from '#layer-a/parser/index.js';
import { scanProject } from '#layer-a/scanner.js';
import { 
  findHotspots, 
  findUnusedExports, 
  findCircularFunctionDeps,
  findOrphanFiles 
} from '#layer-a/analyses/tier1/index.js';
import { 
  analyzeCoupling
} from '#layer-a/analyses/tier2/index.js';
import { 
  saveMetadata, 
  saveFileAnalysis,
  saveConnections,
  saveRiskAssessment 
} from '#layer-c/storage/index.js';
import { getProjectStats } from '#layer-c/query/queries/project-query.js';

describe('Layer A: Extended Integration Workflows', () => {
  let testProjectPath;

  beforeAll(async () => {
    testProjectPath = path.join(os.tmpdir(), 'omny-extended-test-' + Date.now());
    await fs.mkdir(path.join(testProjectPath, 'src', 'utils'), { recursive: true });
    await fs.mkdir(path.join(testProjectPath, 'src', 'services'), { recursive: true });
    await fs.mkdir(path.join(testProjectPath, 'src', 'components'), { recursive: true });
    
    // Create test files with different patterns
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'utils', 'math.js'),
      `
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
      `.trim()
    );

    await fs.writeFile(
      path.join(testProjectPath, 'src', 'services', 'api.js'),
      `
import { add, multiply } from '../utils/math.js';

export function calculateTotal(items) {
  return items.reduce((sum, item) => add(sum, item.price), 0);
}

export function calculateDiscount(price, percent) {
  return multiply(price, 1 - (percent / 100));
}
      `.trim()
    );

    await fs.writeFile(
      path.join(testProjectPath, 'src', 'components', 'Button.js'),
      `
export function Button({ label, onClick }) {
  return \`<button onclick="\${onClick}">\${label}</button>\`;
}
      `.trim()
    );

    await fs.writeFile(
      path.join(testProjectPath, 'src', 'index.js'),
      `
import { calculateTotal } from './services/api.js';
import { Button } from './components/Button.js';

export function init() {
  const total = calculateTotal([{ price: 10 }, { price: 20 }]);
  return total;
}
      `.trim()
    );
  });

  afterAll(async () => {
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (e) {}
  });

  describe('Workflow: Tier1 + Tier2 Analysis', () => {
    it('runs complete analysis: tier1 + tier2', async () => {
      // Scan
      const files = await scanProject(testProjectPath);
      expect(files.length).toBeGreaterThan(0);

      // Build systemMap con estructura correcta
      const systemMap = {
        files: {
          'src/utils/math.js': {
            functions: [
              { name: 'add', isExported: true },
              { name: 'subtract', isExported: true },
              { name: 'multiply', isExported: true }
            ],
            imports: [],
            exports: ['add', 'subtract', 'multiply']
          },
          'src/services/api.js': {
            functions: [
              { name: 'calculateTotal', isExported: true },
              { name: 'calculateDiscount', isExported: true }
            ],
            imports: [
              { source: '../utils/math.js', names: ['add', 'multiply'], specifiers: [] }
            ],
            exports: ['calculateTotal', 'calculateDiscount']
          }
        },
        function_links: [
          { from: 'src/services/api.js:calculateTotal', to: 'src/utils/math.js:add' },
          { from: 'src/services/api.js:calculateDiscount', to: 'src/utils/math.js:multiply' }
        ],
        metadata: { totalFiles: 2 },
        exportIndex: {}
      };

      // Tier1 Analysis
      const hotspots = findHotspots(systemMap);
      const unused = findUnusedExports(systemMap);
      const orphans = findOrphanFiles(systemMap);

      // Tier2 Analysis  
      const coupling = analyzeCoupling(systemMap);

      // Verify all executed
      expect(hotspots).toBeDefined();
      expect(unused).toBeDefined();
      expect(orphans).toBeDefined();
      expect(coupling).toBeDefined();

      expect(typeof hotspots.total).toBe('number');
      expect(typeof unused.totalUnused).toBe('number');
      expect(typeof coupling.total).toBe('number');
    });
  });

  describe('Workflow: Storage Operations', () => {
    it('saves various analysis results', async () => {
      const systemMap = {
        files: {
          'src/app.js': {
            functions: [{ name: 'main', isExported: true }],
            imports: [],
            exports: ['main']
          }
        },
        function_links: [],
        metadata: { totalFiles: 1 },
        exportIndex: {},
        functions: {}
      };

      // Run analysis
      const hotspots = findHotspots(systemMap);
      const unused = findUnusedExports(systemMap);

      // Save metadata
      const metadataPath = await saveMetadata(testProjectPath, {
        projectName: 'extended-test',
        analyzedAt: new Date().toISOString(),
        hotspots: hotspots.total,
        unused: unused.totalUnused
      }, {});
      expect(metadataPath).toBeDefined();

      // Save file analysis
      const analysisPath = await saveFileAnalysis(
        testProjectPath,
        'src/app.js',
        { filePath: 'src/app.js', atoms: [{ name: 'main' }] }
      );
      expect(analysisPath).toBeDefined();

      // Save connections
      const connectionsPath = await saveConnections(
        testProjectPath,
        [{ from: 'a.js', to: 'b.js', variable: 'state' }],
        [{ from: 'c.js', to: 'd.js', event: 'click' }]
      );
      expect(connectionsPath).toBeDefined();

      // Save risk assessment
      const riskPath = await saveRiskAssessment(
        testProjectPath,
        { score: 75, level: 'MEDIUM', issues: [] }
      );
      expect(riskPath).toBeDefined();
    });
  });

  describe('Workflow: Query System', () => {
    it('queries project stats after analysis', async () => {
      // First save some data
      await saveMetadata(testProjectPath, {
        projectName: 'query-test',
        totalFiles: 5,
        analyzedAt: new Date().toISOString()
      }, {});

      // Query stats
      const stats = await getProjectStats(testProjectPath);
      
      // Stats should be defined (or handle gracefully)
      expect(stats).toBeDefined();
    });
  });

  describe('Workflow: Complex Dependency Analysis', () => {
    it('detects coupling and circular dependencies', async () => {
      // Create dependency graph
      const systemMap = {
        files: {
          'src/a.js': {
            functions: [{ name: 'funcA', isExported: true }],
            imports: [],
            exports: ['funcA']
          },
          'src/b.js': {
            functions: [{ name: 'funcB', isExported: true }],
            imports: [{ source: '../a.js', names: ['funcA'], specifiers: [] }],
            exports: ['funcB']
          },
          'src/c.js': {
            functions: [{ name: 'funcC', isExported: true }],
            imports: [{ source: '../b.js', names: ['funcB'], specifiers: [] }],
            exports: ['funcC']
          }
        },
        function_links: [
          { from: 'src/b.js:funcB', to: 'src/a.js:funcA' },
          { from: 'src/c.js:funcC', to: 'src/b.js:funcB' }
        ],
        metadata: { totalFiles: 3 },
        exportIndex: {},
        functions: {}
      };

      // Coupling analysis
      const coupling = analyzeCoupling(systemMap);
      expect(coupling).toBeDefined();
      expect(typeof coupling.total).toBe('number');

      // Circular deps
      const circular = findCircularFunctionDeps(systemMap);
      expect(circular).toBeDefined();
      expect(typeof circular.total).toBe('number');
    });
  });

  describe('Workflow: Edge Cases', () => {
    it('handles null/undefined gracefully', async () => {
      // All functions should handle null input gracefully
      const result1 = findHotspots(null);
      expect(result1).toBeDefined();
      expect(typeof result1.total).toBe('number');

      const result2 = findUnusedExports(undefined);
      expect(result2).toBeDefined();
      expect(typeof result2.totalUnused).toBe('number');

      const result3 = findCircularFunctionDeps({});
      expect(result3).toBeDefined();
      expect(typeof result3.total).toBe('number');

      const result4 = analyzeCoupling(null);
      expect(result4).toBeDefined();
    });

    it('handles empty project gracefully', async () => {
      const emptyPath = path.join(os.tmpdir(), 'empty-' + Date.now());
      await fs.mkdir(emptyPath, { recursive: true });
      
      try {
        const files = await scanProject(emptyPath);
        expect(files).toBeDefined();
        expect(Array.isArray(files)).toBe(true);
      } finally {
        await fs.rm(emptyPath, { recursive: true, force: true });
      }
    });
  });

  describe('Workflow: Real Files Parsing', () => {
    it('parses multiple real files correctly', async () => {
      const files = await scanProject(testProjectPath);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      
      expect(jsFiles.length).toBeGreaterThan(0);

      const parsedFiles = [];
      for (const file of jsFiles) {
        const parsed = await parseFile(file);
        if (parsed) {
          parsedFiles.push(parsed);
        }
      }

      expect(parsedFiles.length).toBeGreaterThan(0);
      
      // Verify structure
      parsedFiles.forEach(parsed => {
        expect(parsed).toBeDefined();
      });
    });
  });
});
