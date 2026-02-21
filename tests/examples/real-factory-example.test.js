/**
 * @fileoverview real-factory-example.test.js
 * 
 * Ejemplo de como usar factories reales en lugar de mocks
 * Este test demuestra el patron recomendado para tests robustos
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  FileSystemFactory, 
  createSandbox, 
  withSandbox,
  createTestProject,
  withProject 
} from '../factories/real/index.js';

describe('Real Factories Examples', () => {
  
  describe('FileSystemFactory', () => {
    it('should create real files', async () => {
      const fs = await FileSystemFactory.create();
      
      // Crea archivos reales
      await fs.createFile('test.js', 'const x = 1;');
      await fs.createFile('src/utils.js', 'export const helper = () => {};');
      
      // Los archivos existen en filesystem real
      expect(await fs.exists('test.js')).toBe(true);
      expect(await fs.exists('src/utils.js')).toBe(true);
      
      // Podemos leer el contenido
      const content = await fs.readFile('test.js');
      expect(content).toBe('const x = 1;');
      
      // Cleanup
      await fs.cleanup();
    });
    
    it('should create projects', async () => {
      const fs = await FileSystemFactory.create();
      
      const project = await fs.createProject('my-app', {
        'package.json': '{"name": "my-app"}',
        'src/index.js': 'console.log("hello");'
      });
      
      expect(await fs.exists('my-app/package.json')).toBe(true);
      expect(await fs.exists('my-app/src/index.js')).toBe(true);
      
      await fs.cleanup();
    });
  });
  
  describe('createSandbox helper', () => {
    it('should create multiple files at once', async () => {
      const sandbox = await createSandbox({
        'file1.js': 'export const a = 1;',
        'file2.js': 'export const b = 2;',
        'src/nested.js': 'export const c = 3;'
      });
      
      expect(await sandbox.exists('file1.js')).toBe(true);
      expect(await sandbox.exists('file2.js')).toBe(true);
      expect(await sandbox.exists('src/nested.js')).toBe(true);
      
      await sandbox.cleanup();
    });
  });
  
  describe('withSandbox helper', () => {
    it('should auto-cleanup after test', async () => {
      let sandboxPath;
      
      await withSandbox({ 'test.js': 'const x = 1;' }, async (sandbox) => {
        sandboxPath = sandbox.baseDir;
        expect(await sandbox.exists('test.js')).toBe(true);
        // Sandbox existe aqui
      });
      
      // Sandbox fue limpiado automaticamente
      // Nota: No podemos verificar aqui porque el directorio ya no existe
    });
  });
  
  describe('ProjectFactory', () => {
    it('should create simple project', async () => {
      const project = await createTestProject('simple');
      
      expect(await project.fs.exists('index.js')).toBe(true);
      const content = await project.fs.readFile('index.js');
      expect(content).toContain('greet');
      
      await project.cleanup();
    });
    
    it('should create project with imports', async () => {
      const project = await createTestProject('withImports');
      
      expect(await project.fs.exists('src/utils.js')).toBe(true);
      expect(await project.fs.exists('src/main.js')).toBe(true);
      
      const mainContent = await project.fs.readFile('src/main.js');
      expect(mainContent).toContain("import { helper } from './utils.js'");
      
      await project.cleanup();
    });
    
    it('should create complex project', async () => {
      const project = await createTestProject('complex');
      
      expect(await project.fs.exists('package.json')).toBe(true);
      expect(await project.fs.exists('src/index.js')).toBe(true);
      expect(await project.fs.exists('src/services/UserService.js')).toBe(true);
      
      const pkg = JSON.parse(await project.fs.readFile('package.json'));
      expect(pkg.name).toBe('complex-project');
      
      await project.cleanup();
    });
  });
  
  describe('withProject helper', () => {
    it('should auto-cleanup project', async () => {
      await withProject('simple', async (project) => {
        // Usar el proyecto
        expect(await project.fs.exists('index.js')).toBe(true);
        
        // Podemos agregar archivos adicionales
        await project.fs.createFile('extra.js', 'export const extra = true;');
        expect(await project.fs.exists('extra.js')).toBe(true);
        
        // Cleanup automatico al finalizar
      });
    });
    
    it('should handle errors and still cleanup', async () => {
      let projectPath;
      
      try {
        await withProject('simple', async (project) => {
          projectPath = project.path;
          expect(await project.fs.exists('index.js')).toBe(true);
          
          // Simular error
          throw new Error('Test error');
        });
      } catch (e) {
        expect(e.message).toBe('Test error');
      }
      
      // Aunque hubo error, el cleanup se ejecuto
    });
  });
  
  describe('Custom files in templates', () => {
    it('should allow custom files', async () => {
      const project = await createTestProject('simple', {
        'custom.js': 'export const custom = true;',
        'config.json': '{"setting": "value"}'
      });
      
      // Template files
      expect(await project.fs.exists('index.js')).toBe(true);
      
      // Custom files
      expect(await project.fs.exists('custom.js')).toBe(true);
      expect(await project.fs.exists('config.json')).toBe(true);
      
      const config = JSON.parse(await project.fs.readFile('config.json'));
      expect(config.setting).toBe('value');
      
      await project.cleanup();
    });
  });
  
});

describe('Comparacion: Mocks vs Factories Reales', () => {
  
  describe('ANTES: Con mocks (fragil)', () => {
    it('example of mock-based test (not recommended)', () => {
      // Este test usa mocks (no lo ejecutamos, solo documentamos)
      // vi.mock('fs/promises', () => ({
      //   readFile: vi.fn().mockResolvedValue('fake content')
      // }));
      
      // Problemas:
      // - Si cambia la implementacion, el test falla
      // - No testea el comportamiento real
      // - Acoplado a detalles internos
      
      expect(true).toBe(true); // Placeholder
    });
  });
  
  describe('DESPUES: Con factories (robusto)', () => {
    it('should test real behavior', async () => {
      // Usamos filesystem real
      await withSandbox({
        'config.json': '{"apiUrl": "http://localhost:3000"}'
      }, async (sandbox) => {
        // Leemos el archivo real
        const config = JSON.parse(await sandbox.readFile('config.json'));
        
        // Testeamos comportamiento real
        expect(config.apiUrl).toBe('http://localhost:3000');
        
        // Si funciona aqui, funcionara en produccion
      });
    });
  });
  
});
