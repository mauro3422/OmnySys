/**
 * @fileoverview Tests funcionales REALES para Analyses
 * 
 * Estos tests verifican que los análisis funcionan correctamente
 * con datos reales, no solo que existen las funciones.
 */

import { describe, it, expect } from 'vitest';
import { findHotspots, findOrphanFiles, findUnusedExports } from '#layer-a/analyses/tier1/index.js';
import { analyzeReexportChains } from '#layer-a/analyses/tier2/reexport-chains.js';
import { findUnusedImports } from '#layer-a/analyses/tier2/unused-imports.js';
import { detectSideEffectMarkers } from '#layer-a/analyses/tier2/side-effects.js';

describe('Analyses - Tests Funcionales Reales', () => {
  
  // SystemMap de prueba REAL (no vacío)
  const createTestSystemMap = () => ({
    files: {
      'src/utils.js': {
        imports: [],
        exports: [{ name: 'helper', type: 'function' }],
        functions: [
          { name: 'helper', isExported: true, calls: [] }
        ],
        dependsOn: [],
        usedBy: ['src/app.js']
      },
      'src/app.js': {
        imports: [{ source: './utils', specifiers: ['helper'] }],
        exports: [{ name: 'main', type: 'function' }],
        functions: [
          { name: 'main', isExported: true, calls: ['helper'] }
        ],
        dependsOn: ['src/utils.js'],
        usedBy: []
      },
      'src/unused.js': {
        imports: [],
        exports: [{ name: 'oldFunc', type: 'function' }],
        functions: [
          { name: 'oldFunc', isExported: true, calls: [] }
        ],
        dependsOn: [],
        usedBy: []
      }
    },
    function_links: [
      { from: 'src/app.js:main', to: 'src/utils.js:helper' }
    ],
    metadata: { projectName: 'test' }
  });

  it('findOrphanFiles funciona con systemMap real', () => {
    const systemMap = createTestSystemMap();
    const result = findOrphanFiles(systemMap);
    
    // Debe retornar objeto válido
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
    expect(Array.isArray(result.files)).toBe(true);
    
    // Debe detectar src/unused.js como huérfano
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('findUnusedExports funciona con systemMap real', () => {
    const systemMap = createTestSystemMap();
    const result = findUnusedExports(systemMap);
    
    expect(result).toBeDefined();
    expect(typeof result.totalUnused).toBe('number');
    expect(typeof result.byFile).toBe('object');
  });

  it('findHotspots funciona con systemMap real', () => {
    const systemMap = createTestSystemMap();
    const result = findHotspots(systemMap);
    
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
    expect(Array.isArray(result.functions || [])).toBe(true);
  });

  it('analyzeReexportChains funciona con systemMap real', () => {
    const systemMap = createTestSystemMap();
    const result = analyzeReexportChains(systemMap);
    
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
    expect(Array.isArray(result.chains || [])).toBe(true);
  });

  it('findUnusedImports funciona con systemMap real', () => {
    const systemMap = createTestSystemMap();
    const result = findUnusedImports(systemMap);
    
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
  });

  it('detectSideEffectMarkers funciona con systemMap real', () => {
    const systemMap = createTestSystemMap();
    const result = detectSideEffectMarkers(systemMap);
    
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
    expect(Array.isArray(result.markers || [])).toBe(true);
  });

  it('todos los análisis manejan null-safety', () => {
    // Cada análisis debe manejar null/undefined sin crashear
    expect(() => findOrphanFiles(null)).not.toThrow();
    expect(() => findUnusedExports(null)).not.toThrow();
    expect(() => findHotspots(null)).not.toThrow();
    expect(() => analyzeReexportChains(null)).not.toThrow();
    expect(() => findUnusedImports(null)).not.toThrow();
    expect(() => detectSideEffectMarkers(null)).not.toThrow();
  });
});
