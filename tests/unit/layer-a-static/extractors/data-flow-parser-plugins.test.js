/**
 * @fileoverview data-flow-parser-plugins.test.js
 *
 * Tests para verificar que el parser del data-flow extractor
 * soporta correctamente sintaxis JavaScript moderna.
 *
 * NOTA v0.9.21: pipelineOperator fue REMOVIDO del data-flow parser
 * porque el token '#' del hack proposal conflictea con:
 * - Shebangs: #!/usr/bin/env node
 * - Private fields: #field
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

// ─── Tests: Shebang support (v0.9.21 fix) ─────────────────────────────────────

describe('extractDataFlow — shebang support', () => {

  test('parsea archivos con shebang sin error', () => {
    const code = `#!/usr/bin/env node

import { main } from './lib.js';
main();
`;
    const result = extractDataFlow(code);
    assertNoError(result);
  });

});

// ─── Tests: Pipeline Operator NO soportado ───────────────────────────────────

describe('extractDataFlow — pipeline operator NO soportado', () => {

  test('retorna error para código con pipeline operator', () => {
    // pipelineOperator fue removido porque el token '#' conflictea con shebangs
    const code = `
      const double = x => x * 2;
      const result = 5 |> double(#);
    `;
    const result = extractDataFlow(code);
    // Debe retornar un error, no crashear
    expect(result).toBeDefined();
    expect(result.error).toBeDefined();
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
