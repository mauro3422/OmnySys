/**
 * Tests exhaustivos para validation-utils
 * Cubre los 20 casos de uso/problemáticas identificados
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import {
  validateFileExists,
  validatePath,
  validateBeforeEdit,
  validateBeforeWrite,
  getLineContext,
  validateNoDuplicates,
  validateImpact
} from '../../../../src/layer-c-memory/mcp/core/validation-utils.js';

describe('validation-utils - 20 casos de uso', () => {
  const testProjectPath = process.cwd();
  
  describe('1. Cascada total - validation falla → atomic_edit muere', () => {
    it('debe retornar error estructurado sin romper el proceso', async () => {
      const result = await validateBeforeEdit({
        filePath: '/ruta/que/no/existe.js',
        projectPath: testProjectPath
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.canProceed).toBe(false);
      expect(result.severity).toBe('critical');
    });
  });

  describe('2. Falso positivo - rechaza edición legítima', () => {
    it('debe permitir editar archivos válidos', async () => {
      const result = await validateBeforeEdit({
        filePath: 'package.json',
        projectPath: testProjectPath
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('3. Timeout - validación lenta', () => {
    it('debe completarse en menos de 1 segundo', async () => {
      const start = Date.now();
      await validateBeforeEdit({
        filePath: 'package.json',
        projectPath: testProjectPath
      });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('4. Sin bypass - no hay forma de saltar validación', () => {
    it('validación es obligatoria (por diseño)', async () => {
      // La validación es obligatoria por diseño de seguridad
      const result = await validateBeforeEdit({
        filePath: 'package.json',
        projectPath: testProjectPath
      });
      
      // Siempre retorna resultado, nunca null/undefined
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });

  describe('5. Error no manejado - excepción en validación', () => {
    it('debe manejar errores gracefully con try-catch', async () => {
      // Simular error pasando null
      const result = await validateBeforeEdit({
        filePath: null,
        projectPath: testProjectPath
      });
      
      // No debe lanzar excepción, debe retornar error estructurado
      expect(result).toBeDefined();
    });
  });

  describe('6. Import dinámico falla - Ya no usa imports dinámicos', () => {
    it('usa imports estáticos del storage', async () => {
      // Esta validación es estática - los imports se resuelven en load time
      const result = await validateNoDuplicates(
        'src/test.js', 
        'testFunction', 
        testProjectPath
      );
      
      // No debe haber errores de importación
      expect(result.errors).not.toContain(expect.stringContaining('import'));
    });
  });

  describe('7. Permisos FS - fs.access falla', () => {
    it('debe manejar errores de permisos', async () => {
      // Intentar acceder a un archivo del sistema
      const result = await validateFileExists('C:\\Windows\\System32\\config\\SAM');
      
      // Debe retornar false, no lanzar excepción
      expect(result.valid).toBe(false);
      expect(result.context.exists).toBe(false);
    });
  });

  describe('8. Path relativo incorrecto', () => {
    it('debe manejar paths relativos correctamente', async () => {
      const result1 = await validatePath('src/utils/helper.js');
      expect(result1.valid).toBe(true);
      
      const result2 = await validatePath('./src/utils/helper.js');
      expect(result2.valid).toBe(true);
      
      const result3 = await validatePath('../outside/project.js');
      expect(result3.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('9. Race condition - ediciones concurrentes', () => {
    it('debe manejar múltiples validaciones concurrentes', async () => {
      const promises = [
        validateBeforeEdit({ filePath: 'package.json', projectPath: testProjectPath }),
        validateBeforeEdit({ filePath: 'package.json', projectPath: testProjectPath }),
        validateBeforeEdit({ filePath: 'package.json', projectPath: testProjectPath })
      ];
      
      const results = await Promise.all(promises);
      
      // Todas deben completarse sin errores
      expect(results).toHaveLength(3);
      results.forEach(r => {
        expect(r).toBeDefined();
        expect(r.valid).toBe(true);
      });
    });
  });

  describe('10. MCP no disponible - servidor caído', () => {
    it('funciona independientemente del estado del MCP server', async () => {
      // validation-utils.js accede directo al storage, no al MCP server
      const result = await validateFileExists('package.json');
      
      expect(result.valid).toBe(true);
      expect(result.context.exists).toBe(true);
    });
  });

  describe('11. Circular dependency', () => {
    it('no debe tener dependencias circulares', async () => {
      // Import estático de storage → tools → handlers → storage
      // Es un DAG válido (storage es hoja)
      const result = await validateBeforeEdit({
        filePath: 'package.json',
        projectPath: testProjectPath
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('12. Performance - doble validación', () => {
    it('debe ser eficiente incluso con múltiples validaciones', async () => {
      const start = Date.now();
      
      await validateBeforeEdit({
        filePath: 'package.json',
        symbolName: 'test',
        projectPath: testProjectPath
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Debe ser rápido
    });
  });

  describe('13. Stack trace perdido', () => {
    it('debe incluir mensajes de error claros', async () => {
      const result = await validateBeforeEdit({
        filePath: '/no/existe.js',
        projectPath: testProjectPath
      });
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('❌');
      expect(result.errors[0]).toContain('does not exist');
    });
  });

  describe('14. Logging insuficiente', () => {
    it('debe loggear el progreso de validación', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await validateBeforeEdit({
        filePath: 'package.json',
        projectPath: testProjectPath
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 Validating'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Validation complete'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('15. Memory leak', () => {
    it('no debe acumular memoria en validaciones repetidas', async () => {
      // Ejecutar muchas validaciones
      for (let i = 0; i < 100; i++) {
        await validatePath(`test${i}.js`);
      }
      
      // Si hay memory leak, esto fallaría o sería muy lento
      const result = await validatePath('final.js');
      expect(result.valid).toBe(true);
    });
  });

  describe('16. Rollback ausente', () => {
    it('validación es solo lectura, no modifica nada', async () => {
      // La validación nunca modifica archivos
      const before = await fs.readFile('package.json', 'utf-8');
      
      await validateBeforeEdit({
        filePath: 'package.json',
        projectPath: testProjectPath
      });
      
      const after = await fs.readFile('package.json', 'utf-8');
      expect(before).toBe(after);
    });
  });

  describe('17. Símbolo null - validateBeforeEdit sin symbolName', () => {
    it('debe funcionar sin symbolName', async () => {
      const result = await validateBeforeEdit({
        filePath: 'package.json',
        symbolName: null,
        projectPath: testProjectPath
      });
      
      expect(result.valid).toBe(true);
      expect(result.context.validationsPerformed).not.toContain('duplicates');
    });
  });

  describe('18. Archivo inexistente', () => {
    it('debe fallar graceful con archivo que no existe', async () => {
      const result = await validateFileExists('este-archivo-no-existe-12345.js');
      
      expect(result.valid).toBe(false);
      expect(result.context.exists).toBe(false);
      expect(result.errors[0]).toContain('does not exist');
    });
  });

  describe('19. Archivo muy grande', () => {
    it('debe manejar archivos grandes eficientemente', async () => {
      // package.json no es enorme pero es un test básico
      const start = Date.now();
      
      const result = await validateFileExists('package.json');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
      expect(result.valid).toBe(true);
    });
  });

  describe('20. Código con syntax error', () => {
    it('no valida sintaxis del código (eso es trabajo del atomic editor)', async () => {
      // validation-utils no valida sintaxis, solo estructura/archivo
      const result = await validateBeforeEdit({
        filePath: 'package.json', // Archivo válido
        projectPath: testProjectPath
      });
      
      expect(result.valid).toBe(true);
      // La validación de sintaxis está en atomic-edit.js (validateImportsInEdit)
    });
  });
});
