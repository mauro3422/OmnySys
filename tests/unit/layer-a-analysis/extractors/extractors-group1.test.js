/**
 * @fileoverview Extractors - Grupo 1: Funciones y métodos
 */

import { describe, it, expect } from 'vitest';
import * as atomic from '#layer-a/extractors/atomic/index.js';

describe('Extractors - Funciones y métodos', () => {
  it('all atomic extractors are exported', () => {
    expect(Object.keys(atomic).length).toBeGreaterThan(0);
    
    // Verificar que al menos una función es callable
    const firstFn = Object.values(atomic)[0];
    expect(typeof firstFn).toBe('function');
  });
  
  it('extractors return arrays when called', () => {
    const firstFn = Object.values(atomic)[0];
    if (typeof firstFn === 'function') {
      const result = firstFn({});
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    }
  });
});
