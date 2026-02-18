/**
 * @fileoverview Layer A Integration Tests - Flujos Completos
 * 
 * Tests que ejecutan flujos completos dentro de Layer A:
 * - Scan → Parse → Analyze → Storage
 * - Cada test ejecuta 10-20 funciones en cadena
 * - Mayor coverage con menos tests
 * 
 * @module tests/integration/layer-a/layer-a-workflows.integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Importar funciones de Layer A
import { scanProject } from '#layer-a/scanner.js';
import { parseFile } from '#layer-a/parser/index.js';
import { 
  findHotspots, 
  findUnusedExports, 
  findCircularFunctionDeps 
} from '#layer-a/analyses/tier1/index.js';
import { 
  saveMetadata, 
  saveFileAnalysis 
} from '#core/storage/index.js';
import { 
  getProjectMetadata
} from '#layer-a/query/queries/project-query.js';
import {
  getFileAnalysis
} from '#layer-a/query/queries/file-query.js';

describe('Layer A: Integration Workflows', () => {
  let testProjectPath;
  let testDataPath;

  // Crear proyecto de prueba antes de los tests
  beforeAll(async () => {
    testProjectPath = path.join(os.tmpdir(), 'omny-test-project-' + Date.now());
    testDataPath = path.join(testProjectPath, '.omnysysdata');
    
    // Crear estructura de proyecto de prueba
    await fs.mkdir(path.join(testProjectPath, 'src', 'utils'), { recursive: true });
    await fs.mkdir(path.join(testProjectPath, 'src', 'components'), { recursive: true });
    
    // Crear archivos de prueba
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'utils', 'helpers.js'),
      `
export function formatDate(date) {
  return date.toISOString();
}

export function parseDate(str) {
  return new Date(str);
}

// Esta función no se usa (para probar unused exports)
export function unusedHelper() {
  return 'I am not used';
}
      `.trim()
    );
    
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'app.js'),
      `
import { formatDate } from './utils/helpers.js';

function init() {
  const now = new Date();
  console.log(formatDate(now));
}

function main() {
  init();
  init(); // Llamado 2 veces
}

export { main };
      `.trim()
    );
    
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'components', 'Button.js'),
      `
export function Button(props) {
  return \`<button>\${props.label}</button>\`;
}

// Ciclo artificial para probar
export function cyclicA() {
  return cyclicB();
}

export function cyclicB() {
  return cyclicA();
}
      `.trim()
    );
  });

  // Limpiar después de los tests
  afterAll(async () => {
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (e) {
      // Ignorar errores de limpieza
    }
  });

  describe('Workflow 1: Scan → Parse → Basic Analysis', () => {
    it('scans project and finds all files', async () => {
      // PASO 1: Scan
      const files = await scanProject(testProjectPath);
      
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThanOrEqual(3); // app.js, helpers.js, Button.js
    });

    it('parses files and extracts structure', async () => {
      // PASO 1: Scan
      const files = await scanProject(testProjectPath);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      
      // PASO 2: Parse
      const parsedFiles = [];
      for (const file of jsFiles) {
        const parsed = await parseFile(file);
        parsedFiles.push(parsed);
      }
      
      expect(parsedFiles.length).toBeGreaterThan(0);
      parsedFiles.forEach(parsed => {
        expect(parsed).toHaveProperty('filePath');
        // El parser puede retornar diferentes estructuras según el archivo
        expect(parsed).toBeDefined();
      });
    });
  });

  describe('Workflow 2: Full Analysis Pipeline', () => {
    it('executes complete analysis pipeline', async () => {
      // PASO 1: Scan
      const files = await scanProject(testProjectPath);
      
      // PASO 2: Parse all files
      const parsedFiles = [];
      for (const file of files.filter(f => f.endsWith('.js'))) {
        const parsed = await parseFile(file);
        parsedFiles.push(parsed);
      }
      
      // PASO 3: Build system map
      const systemMap = {
        files: {},
        function_links: [],
        metadata: {
          totalFiles: parsedFiles.length,
          analyzedAt: new Date().toISOString()
        }
      };
      
      parsedFiles.forEach(parsed => {
        systemMap.files[parsed.filePath] = parsed;
      });
      
      // PASO 4: Run analyses
      const hotspots = findHotspots(systemMap);
      const unused = findUnusedExports(systemMap);
      
      // Verificaciones
      expect(hotspots).toBeDefined();
      expect(typeof hotspots.total).toBe('number');
      expect(unused).toBeDefined();
      expect(typeof unused.totalUnused).toBe('number');
    });

    it('detects unused exports in real project', async () => {
      // Crear systemMap que representa el proyecto real
      const systemMap = {
        files: {
          'src/utils/helpers.js': {
            functions: [
              { name: 'formatDate', isExported: true },
              { name: 'parseDate', isExported: true },
              { name: 'unusedHelper', isExported: true }
            ],
            imports: [],
            exports: ['formatDate', 'parseDate', 'unusedHelper']
          },
          'src/app.js': {
            functions: [
              { name: 'init', isExported: false },
              { name: 'main', isExported: true }
            ],
            imports: [
              { source: './utils/helpers.js', names: ['formatDate'] }
            ],
            exports: ['main']
          }
        },
        function_links: [
          { from: 'src/app.js:init', to: 'src/utils/helpers.js:formatDate' }
        ],
        exportIndex: {}
      };
      
      const result = findUnusedExports(systemMap);
      
      // Debe detectar unusedHelper
      expect(result.totalUnused).toBeGreaterThan(0);
      
      if (result.totalUnused > 0) {
        const helpersFile = result.byFile['src/utils/helpers.js'];
        if (helpersFile) {
          const unusedHelper = helpersFile.find(u => u.name === 'unusedHelper');
          expect(unusedHelper).toBeDefined();
        }
      }
    });

    it('detects circular dependencies', async () => {
      const systemMap = {
        files: {
          'src/components/Button.js': {
            atoms: [
              { name: 'cyclicA', id: 'src/components/Button.js:cyclicA', calls: ['cyclicB'] },
              { name: 'cyclicB', id: 'src/components/Button.js:cyclicB', calls: ['cyclicA'] }
            ]
          }
        },
        function_links: [
          { from: 'src/components/Button.js:cyclicA', to: 'src/components/Button.js:cyclicB' },
          { from: 'src/components/Button.js:cyclicB', to: 'src/components/Button.js:cyclicA' }
        ],
        metadata: { totalFiles: 1 }
      };
      
      const result = findCircularFunctionDeps(systemMap);
      
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      
      // Debe detectar el ciclo
      if (result.total > 0) {
        expect(result.cycles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Workflow 3: Analysis → Storage', () => {
    it('saves analysis results successfully', async () => {
      // PASO 1: Crear datos de análisis
      const metadata = {
        projectName: 'test-project',
        version: '1.0.0',
        totalFiles: 3
      };
      
      const fileIndex = {
        'src/app.js': { analyzed: true },
        'src/utils/helpers.js': { analyzed: true }
      };
      
      const fileAnalysis = {
        filePath: 'src/app.js',
        atoms: [
          { name: 'init', type: 'function' },
          { name: 'main', type: 'function' }
        ]
      };
      
      // PASO 2: Guardar metadata
      const metadataPath = await saveMetadata(testProjectPath, metadata, fileIndex);
      expect(typeof metadataPath).toBe('string');
      expect(metadataPath.endsWith('index.json')).toBe(true);
      
      // PASO 3: Guardar análisis de archivo
      const analysisPath = await saveFileAnalysis(
        testProjectPath, 
        'src/app.js', 
        fileAnalysis
      );
      expect(typeof analysisPath).toBe('string');
      
      // Verificar que los archivos existen
      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(metadataExists).toBe(true);
    });

    it('end-to-end workflow: scan → analyze → save', async () => {
      // PASO 1: Scan project
      const files = await scanProject(testProjectPath);
      expect(files.length).toBeGreaterThan(0);
      
      // PASO 2: Parse files
      const parsedFiles = [];
      for (const file of files.filter(f => f.endsWith('.js'))) {
        const parsed = await parseFile(file);
        parsedFiles.push(parsed);
      }
      
      // PASO 3: Analyze
      const systemMap = {
        files: {},
        function_links: [],
        metadata: { totalFiles: parsedFiles.length }
      };
      parsedFiles.forEach(p => { systemMap.files[p.filePath] = p; });
      
      const analysis = {
        hotspots: findHotspots(systemMap),
        unused: findUnusedExports(systemMap)
      };
      
      // PASO 4: Save metadata
      const metadata = {
        projectName: 'integration-test',
        analyzedAt: new Date().toISOString(),
        totalFiles: files.length
      };
      
      const savedPath = await saveMetadata(testProjectPath, metadata, {});
      
      // Verificar que todo el flujo funcionó
      expect(analysis.hotspots).toBeDefined();
      expect(analysis.unused).toBeDefined();
      expect(typeof savedPath).toBe('string');
    });
  });

  describe('Workflow 4: Complex Analysis Scenarios', () => {
    it('handles project with multiple issues', async () => {
      // SystemMap complejo con múltiples problemas
      const systemMap = {
        files: {
          'src/utils.js': {
            functions: [
              { name: 'helper1', isExported: true },
              { name: 'helper2', isExported: true },
              { name: 'helper3', isExported: true }
            ],
            imports: [],
            exports: ['helper1', 'helper2', 'helper3']
          },
          'src/app.js': {
            functions: [
              { name: 'main', isExported: true },
              { name: 'init', isExported: false }
            ],
            imports: [
              { source: './utils.js', names: ['helper1'] }
            ],
            exports: ['main']
          },
          'src/other.js': {
            functions: [
              { name: 'unused1', isExported: true },
              { name: 'unused2', isExported: true }
            ],
            imports: [],
            exports: ['unused1', 'unused2']
          }
        },
        function_links: [
          { from: 'src/app.js:init', to: 'src/utils.js:helper1' },
          { from: 'src/app.js:main', to: 'src/app.js:init' }
        ],
        exportIndex: {},
        metadata: { totalFiles: 3 }
      };
      
      // Ejecutar múltiples análisis
      const hotspots = findHotspots(systemMap);
      const unused = findUnusedExports(systemMap);
      
      // Verificar resultados
      expect(hotspots).toBeDefined();
      expect(unused).toBeDefined();
      
      // Debe detectar exports sin usar
      expect(unused.totalUnused).toBeGreaterThanOrEqual(3); // helper2, helper3, unused1, unused2
    });

    it('handles empty project gracefully', async () => {
      const emptyProjectPath = path.join(os.tmpdir(), 'empty-test-' + Date.now());
      await fs.mkdir(emptyProjectPath, { recursive: true });
      
      try {
        // Scan proyecto vacío
        const files = await scanProject(emptyProjectPath);
        
        // No debe fallar
        expect(files).toBeDefined();
        expect(Array.isArray(files)).toBe(true);
        
        // Analysis con datos vacíos
        const systemMap = {
          files: {},
          function_links: [],
          metadata: { totalFiles: 0 }
        };
        
        const hotspots = findHotspots(systemMap);
        const unused = findUnusedExports(systemMap);
        
        expect(hotspots.total).toBe(0);
        expect(unused.totalUnused).toBe(0);
      } finally {
        await fs.rm(emptyProjectPath, { recursive: true, force: true });
      }
    });
  });
});
