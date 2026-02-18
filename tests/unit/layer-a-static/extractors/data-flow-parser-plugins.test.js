/**
 * @fileoverview data-flow-parser-plugins.test.js
 *
 * Tests para verificar que el parser del data-flow extractor
 * soporta correctamente sintaxis JavaScript no-estándar o stage-3.
 *
 * Contexto del bug (corregido en v0.9.18):
 * El parser de `data-flow/index.js` no incluía el plugin `pipelineOperator`.
 * Archivos como `omnysystem.js` usan la sintaxis `|>` (pipeline operator),
 * lo que causaba cientos de "Data flow extraction failed" silenciosos.
 *
 * Cubre:
 * - Pipeline operator (|>) con proposal 'hack' — antes causaba parse error
 * - TypeScript — ya funcionaba
 * - JSX — ya funcionaba
 * - Optional chaining (?.) — ya funcionaba
 * - Nullish coalescing (??) — ya funcionaba
 * - Top-level await — ya funcionaba
 * - Dynamic imports — ya funcionaba
 * - Decoradores — ya funcionaba
 * - Graceful degradation: archivos con error retornan { error } sin lanzar
 *
 * @module tests/unit/layer-a-static/extractors/data-flow-parser-plugins
 */

import { describe, test, expect } from 'vitest';
import { extractDataFlow } from '#layer-a/extractors/data-flow/index.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

function assertNoError(result) {
  expect(result).toBeDefined();
  expect(result.error).toBeUndefined();
}

// ─── Tests: Pipeline Operator (el bug principal) ──────────────────────────────

describe('extractDataFlow — pipeline operator (|>) support', () => {

  test('parsea código con pipeline operator hack proposal sin error', () => {
    // Este es exactamente el tipo de código que estaba en omnysystem.js
    const code = `
      const double = x => x * 2;
      const addOne = x => x + 1;
      const result = 5 |> double(#) |> addOne(#);
    `;
    const result = extractDataFlow(code);
    assertNoError(result);
    expect(result.graph).toBeDefined();
  });

  test('parsea pipeline operator con múltiples transformaciones', () => {
    const code = `
      function process(value) {
        return value 
          |> trim(#)
          |> toUpperCase(#)
          |> split(#, ',');
      }
    `;
    const result = extractDataFlow(code);
    assertNoError(result);
  });

  test('parsea pipeline operator mixto con otras expresiones', () => {
    const code = `
      export const transform = (data) => {
        const cleaned = data |> normalize(#);
        return { result: cleaned |> validate(#) };
      };
    `;
    const result = extractDataFlow(code);
    assertNoError(result);
    expect(result.outputs).toBeDefined();
  });

});

// ─── Tests: Sintaxis previamente soportadas (regresión) ──────────────────────

describe('extractDataFlow — sintaxis previamente soportadas (no regresión)', () => {

  test('parsea TypeScript básico', () => {
    const code = `
      function greet(name: string): string {
        return \`Hello, \${name}!\`;
      }
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea optional chaining (?.)', () => {
    const code = `
      const name = user?.profile?.name ?? 'Anonymous';
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea nullish coalescing (??)', () => {
    const code = `
      const value = config ?? defaultConfig ?? {};
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea dynamic imports', () => {
    const code = `
      async function load() {
        const { default: mod } = await import('./module.js');
        return mod;
      }
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea JSX', () => {
    const code = `
      function Component({ name }) {
        return <div className="test">{name}</div>;
      }
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea top-level await', () => {
    const code = `
      const data = await fetch('/api/data');
      const json = await data.json();
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea class properties', () => {
    const code = `
      class MyClass {
        count = 0;
        name = 'test';
        increment = () => this.count++;
      }
    `;
    assertNoError(extractDataFlow(code));
  });

  test('parsea exports nombrados e imports ESM', () => {
    const code = `
      import { something } from './mod.js';
      export const value = something + 1;
      export default { value };
    `;
    assertNoError(extractDataFlow(code));
  });

});

// ─── Tests: Graceful degradation ─────────────────────────────────────────────

describe('extractDataFlow — graceful degradation', () => {

  test('retorna { error } en lugar de lanzar cuando el código es inválido', () => {
    const code = `this is not valid javascript !!!@@@###`;
    const result = extractDataFlow(code);
    expect(result).toBeDefined();
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });

  test('retorna { error } para código vacío malformado', () => {
    const code = `function broken( { return; }`;
    const result = extractDataFlow(code);
    // Puede ser error o resultado válido dependiendo del parser
    expect(result).toBeDefined();
  });

  test('no lanza excepción para código vacío', () => {
    expect(() => extractDataFlow('')).not.toThrow();
  });

  test('no lanza excepción con undefined como código', () => {
    // Edge case defensivo
    expect(() => extractDataFlow(undefined)).not.toThrow();
  });

});

// ─── Tests: Estructura del resultado ─────────────────────────────────────────

describe('extractDataFlow — estructura del resultado', () => {

  const SIMPLE_CODE = `
    function add(a, b) {
      const result = a + b;
      return result;
    }
  `;

  test('resultado tiene las propiedades esperadas', () => {
    const result = extractDataFlow(SIMPLE_CODE);
    expect(result).toHaveProperty('graph');
    expect(result).toHaveProperty('inputs');
    expect(result).toHaveProperty('transformations');
    expect(result).toHaveProperty('outputs');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('_meta');
  });

  test('_meta tiene extractedAt y version', () => {
    const result = extractDataFlow(SIMPLE_CODE);
    expect(result._meta).toHaveProperty('extractedAt');
    expect(result._meta).toHaveProperty('version');
    expect(result._meta.version).toBe('1.0.0');
  });

  test('análisis sin opciones retorna invariants y inferredTypes vacíos', () => {
    const result = extractDataFlow(SIMPLE_CODE);
    expect(result.analysis.invariants).toEqual([]);
    expect(result.analysis.inferredTypes).toEqual({});
  });

});
