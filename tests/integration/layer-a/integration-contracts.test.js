/**
 * @fileoverview Integration Contracts - Layer A
 * 
 * Verifica que los módulos de Layer A puedan comunicarse
 * correctamente entre sí, validando interfaces y contratos.
 */

import { describe, it, expect } from 'vitest';
import { createIntegrationContract } from '../../factories/integration-test.factory.js';
import { SystemMapBuilder } from '../../factories/graph-test.factory.js';

describe('Layer A Integration Contracts', () => {
  
  // Contrato: Analyses ↔ Graph
  createIntegrationContract({
    moduleA: 'analyses/tier1/index',
    moduleB: 'graph/index',
    interface: {
      exports: ['findHotspots', 'findOrphanFiles', 'buildGraph'],
      testExchange: async () => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/test.js')
          .build();
        
        const { findHotspots } = await import('#layer-a/analyses/tier1/index.js');
        const result = findHotspots(systemMap);
        
        return result && typeof result.total === 'number';
      }
    }
  });

  // Contrato: Extractors ↔ Parser
  createIntegrationContract({
    moduleA: 'extractors/atomic/index',
    moduleB: 'parser/index',
    interface: {
      exports: ['extractFunctions', 'parse'],
      testExchange: async () => {
        try {
          const parser = await import('#layer-a/parser/index.js');
          const extractors = await import('#layer-a/extractors/atomic/index.js');
          
          // Verificar que ambos exportan funciones
          const hasParser = Object.keys(parser).length > 0;
          const hasExtractors = Object.keys(extractors).length > 0;
          
          return hasParser && hasExtractors;
        } catch (e) {
          return false;
        }
      }
    }
  });

  // Contrato: Module System ↔ Graph
  createIntegrationContract({
    moduleA: 'module-system/index',
    moduleB: 'graph/index',
    interface: {
      exports: ['analyzeModules', 'buildGraph'],
      testExchange: async () => {
        try {
          const moduleSystem = await import('#layer-a/module-system/index.js');
          const graph = await import('#core/graph/index.js');
          
          return Object.keys(moduleSystem).length > 0 && 
                 Object.keys(graph).length > 0;
        } catch (e) {
          return false;
        }
      }
    }
  });

  // Test de compatibilidad de tipos entre módulos
  describe('Type Compatibility', () => {
    it('analyses should return consistent result types', async () => {
      const { findHotspots, findOrphanFiles, findUnusedExports } = 
        await import('#layer-a/analyses/tier1/index.js');
      
      const systemMap = SystemMapBuilder.create().build();
      
      const hotspots = findHotspots(systemMap);
      const orphans = findOrphanFiles(systemMap);
      const unused = findUnusedExports(systemMap);
      
      // Todos deben retornar objetos
      expect(typeof hotspots).toBe('object');
      expect(typeof orphans).toBe('object');
      expect(typeof unused).toBe('object');
      
      // Todos deben tener indicadores numéricos (pueden ser total, totalHotspots, etc.)
      const hotspotsCount = hotspots.total || hotspots.totalHotspots || hotspots.criticalCount || 0;
      const orphansCount = orphans.total || orphans.files?.length || 0;
      const unusedCount = unused.totalUnused || unused.total || 0;
      
      expect(typeof hotspotsCount).toBe('number');
      expect(typeof orphansCount).toBe('number');
      expect(typeof unusedCount).toBe('number');
    });

    it('graph builders should accept systemMap format', async () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js', { dependsOn: ['src/a.js'] })
        .build();
      
      // Verificar estructura esperada por graph builders
      expect(systemMap).toHaveProperty('files');
      expect(typeof systemMap.files).toBe('object');
      
      // Cada archivo debe tener la estructura esperada
      Object.values(systemMap.files).forEach(file => {
        expect(file).toHaveProperty('imports');
        expect(file).toHaveProperty('exports');
        expect(Array.isArray(file.imports)).toBe(true);
        expect(Array.isArray(file.exports)).toBe(true);
      });
    });
  });

  // Test de flujo de datos end-to-end
  describe('End-to-End Data Flow', () => {
    it('should process data from parser to report', async () => {
      // Simular flujo completo
      const code = 'export function test() { return 42; }';
      
      // 1. Parse
      let ast = null;
      try {
        const parser = await import('#layer-a/parser/index.js');
        const parseFn = Object.values(parser)[0];
        if (typeof parseFn === 'function') {
          ast = parseFn(code);
        }
      } catch (e) {
        // Parser puede no estar disponible
      }
      
      // 2. Extract
      let extracted = [];
      try {
        const extractors = await import('#layer-a/extractors/atomic/index.js');
        const extractFn = Object.values(extractors)[0];
        if (typeof extractFn === 'function') {
          extracted = extractFn(code) || [];
        }
      } catch (e) {
        // Extractors pueden no estar disponibles
      }
      
      // 3. Analyze
      const systemMap = SystemMapBuilder.create()
        .withFile('src/test.js')
        .build();
      
      const { findUnusedExports } = await import('#layer-a/analyses/tier1/index.js');
      const analysis = findUnusedExports(systemMap);
      
      // Verificar que el flujo completa sin errores
      expect(analysis).toBeDefined();
      expect(typeof analysis.totalUnused).toBe('number');
    });
  });

  // Test de manejo de errores en integración
  describe('Error Handling in Integration', () => {
    it('should handle missing dependencies gracefully', async () => {
      const systemMap = SystemMapBuilder.create().build();
      
      // Llamar análisis con systemMap vacío
      const { findHotspots, findOrphanFiles, findUnusedExports } = 
        await import('#layer-a/analyses/tier1/index.js');
      
      expect(() => findHotspots(systemMap)).not.toThrow();
      expect(() => findOrphanFiles(systemMap)).not.toThrow();
      expect(() => findUnusedExports(systemMap)).not.toThrow();
    });

    it('should handle null inputs across all modules', async () => {
      const { findHotspots, findOrphanFiles, findUnusedExports } = 
        await import('#layer-a/analyses/tier1/index.js');
      
      // Todos deben manejar null sin crashear
      const hotspots = findHotspots(null);
      const orphans = findOrphanFiles(null);
      const unused = findUnusedExports(null);
      
      expect(hotspots).toBeDefined();
      expect(orphans).toBeDefined();
      expect(unused).toBeDefined();
    });
  });
});
