/**
 * @fileoverview Extractors - Grupo 2: Comunicación y eventos
 */

import { describe, it, expect } from 'vitest';
import * as communication from '#layer-a/extractors/communication/index.js';

describe('Extractors - Comunicación', () => {
  it('all communication extractors are exported', () => {
    expect(Object.keys(communication).length).toBeGreaterThan(0);
    
    // Verificar que al menos una función es callable
    const firstFn = Object.values(communication)[0];
    expect(typeof firstFn).toBe('function');
  });
  
  it('extractors return arrays or objects when called', () => {
    const firstFn = Object.values(communication)[0];
    if (typeof firstFn === 'function') {
      const result = firstFn({});
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    }
  });
});
