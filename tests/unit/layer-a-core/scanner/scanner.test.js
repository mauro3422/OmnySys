/**
 * @fileoverview Tests para el Scanner de Layer A
 * 
 * Test coverage:
 * - scanProject(): Encuentra archivos
 * - Filtrado de extensiones
 * - Ignorar carpetas (node_modules, etc.)
 * - Respeto de .averignore
 * - Manejo de proyectos vacíos
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scanProject } from '../../../../src/layer-a-static/scanner.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Layer A - Scanner', () => {
  let tempDir;

  beforeAll(async () => {
    // Crear estructura temporal para tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omnysys-test-'));
    
    // Crear archivos de prueba
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'node_modules', 'some-package'), { recursive: true });
    
    await fs.writeFile(path.join(tempDir, 'src', 'index.js'), '// main file');
    await fs.writeFile(path.join(tempDir, 'src', 'utils.ts'), '// utils');
    await fs.writeFile(path.join(tempDir, 'src', 'components', 'Button.jsx'), '// button');
    await fs.writeFile(path.join(tempDir, 'src', 'styles.css'), '/* styles */');
    await fs.writeFile(path.join(tempDir, 'node_modules', 'some-package', 'index.js'), '// package');
    
    // Crear .averignore
    await fs.writeFile(path.join(tempDir, '.averignore'), `
# Test ignore
*.test.js
dist/
    `);
    
    // Crear archivos ignorados
    await fs.mkdir(path.join(tempDir, 'dist'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'dist', 'bundle.js'), '// bundled');
    await fs.writeFile(path.join(tempDir, 'src', 'test.test.js'), '// test');
  });

  describe('scanProject() - Basic scanning', () => {
    it('should find all JS/TS files', async () => {
      const files = await scanProject(tempDir);
      
      // Debe encontrar los archivos JS/TS/JSX
      const fileNames = files.map(f => path.basename(f));
      expect(fileNames).toContain('index.js');
      expect(fileNames).toContain('utils.ts');
      expect(fileNames).toContain('Button.jsx');
    });

    it('should ignore node_modules', async () => {
      const files = await scanProject(tempDir);
      
      const hasNodeModules = files.some(f => f.includes('node_modules'));
      expect(hasNodeModules).toBe(false);
    });

    it('should ignore non-JS files', async () => {
      const files = await scanProject(tempDir);
      
      const hasCss = files.some(f => f.endsWith('.css'));
      expect(hasCss).toBe(false);
    });

    it('should respect .averignore patterns', async () => {
      const files = await scanProject(tempDir);
      
      const fileNames = files.map(f => path.basename(f));
      // dist/ está en .averignore
      expect(fileNames).not.toContain('bundle.js');
      // *.test.js está en .averignore
      expect(fileNames).not.toContain('test.test.js');
    });

    it('should return relative paths by default', async () => {
      const files = await scanProject(tempDir);
      
      if (files.length > 0) {
        // Las rutas deben ser relativas al proyecto, no absolutas
        expect(files[0]).not.toContain(tempDir);
        expect(files[0]).toMatch(/^src\//);
      }
    });

    it('should return absolute paths when requested', async () => {
      const files = await scanProject(tempDir, { returnAbsolute: true });
      
      if (files.length > 0) {
        expect(path.isAbsolute(files[0])).toBe(true);
        expect(files[0]).toContain(tempDir);
      }
    });
  });

  describe('scanProject() - Options', () => {
    it('should include additional patterns when specified', async () => {
      const files = await scanProject(tempDir, {
        includePatterns: ['**/*.css']  // Pattern recursivo
      });
      
      const fileNames = files.map(f => path.basename(f));
      expect(fileNames).toContain('styles.css');
    });

    it('should exclude additional patterns when specified', async () => {
      const files = await scanProject(tempDir, {
        excludePatterns: ['**/components/**']
      });
      
      const fileNames = files.map(f => path.basename(f));
      expect(fileNames).not.toContain('Button.jsx');
      expect(fileNames).toContain('index.js'); // Este sí debe estar
    });
  });

  describe('scanProject() - Edge cases', () => {
    it('should handle empty directories', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omnysys-empty-'));
      
      const files = await scanProject(emptyDir);
      
      expect(files).toEqual([]);
    });

    it('should handle directories with no JS files', async () => {
      const noJsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omnysys-nojs-'));
      await fs.writeFile(path.join(noJsDir, 'README.md'), '# Readme');
      await fs.writeFile(path.join(noJsDir, 'data.json'), '{}');
      
      const files = await scanProject(noJsDir);
      
      expect(files).toEqual([]);
    });
  });
});
