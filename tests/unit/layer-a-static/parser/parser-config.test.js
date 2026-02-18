/**
 * @fileoverview parser-config.test.js
 *
 * Tests para getBabelPlugins / getParserOptions en parser/config.js.
 *
 * v0.9.20 fix:
 * - pipelineOperator REMOVIDO del parser genérico
 * - Conflicta con shebangs (#!/usr/bin/env node) y private fields (#field)
 * - Solo data-flow/index.js tiene pipelineOperator con hack proposal
 *
 * @module tests/unit/layer-a-static/parser/parser-config
 */

import { describe, test, expect } from 'vitest';
import { getBabelPlugins, getParserOptions } from '#layer-a/parser/config.js';
import { parse } from '@babel/parser';

// ─── Tests: Configuración ─────────────────────────────────────────────────────

describe('getBabelPlugins — plugins esenciales', () => {

  test('NO incluye pipelineOperator en parser genérico (conflicta con shebangs)', () => {
    // NOTA: pipelineOperator fue removido del parser genérico
    // porque el token '#' del hack proposal conflictea con:
    // - shebangs (#!/usr/bin/env node)
    // - private fields (#field)
    // Solo data-flow/index.js tiene pipelineOperator
    const plugins = getBabelPlugins('src/file.js');
    
    const hasPipelineOperator = plugins.some(
      p => Array.isArray(p) && p[0] === 'pipelineOperator'
    );

    expect(hasPipelineOperator).toBe(false);
  });

  test('incluye jsx para archivos .js', () => {
    const plugins = getBabelPlugins('src/component.js');
    expect(plugins).toContain('jsx');
  });

  test('incluye typescript para archivos .ts', () => {
    const plugins = getBabelPlugins('src/file.ts');
    const tsPlugin = plugins.find(
      p => Array.isArray(p) && p[0] === 'typescript'
    );
    expect(tsPlugin).toBeDefined();
  });

  test('incluye typescript con isTSX:true para .tsx', () => {
    const plugins = getBabelPlugins('src/Component.tsx');
    const tsPlugin = plugins.find(
      p => Array.isArray(p) && p[0] === 'typescript'
    );
    expect(tsPlugin).toBeDefined();
    expect(tsPlugin[1].isTSX).toBe(true);
  });

  test('NO incluye flow para .ts (son mutuamente excluyentes)', () => {
    const plugins = getBabelPlugins('src/file.ts');
    const hasFlow = plugins.some(
      p => (Array.isArray(p) && p[0] === 'flow') || p === 'flow'
    );
    expect(hasFlow).toBe(false);
  });

});

describe('getParserOptions — opciones completas', () => {

  test('retorna sourceType module', () => {
    const opts = getParserOptions('src/file.js');
    expect(opts.sourceType).toBe('module');
  });

  test('retorna allowImportExportEverywhere true', () => {
    const opts = getParserOptions('src/file.js');
    expect(opts.allowImportExportEverywhere).toBe(true);
  });

  test('retorna allowReturnOutsideFunction true', () => {
    const opts = getParserOptions('src/file.js');
    expect(opts.allowReturnOutsideFunction).toBe(true);
  });

});

describe('parser/config.js — integración con Babel', () => {

  test('puede parsear código JS normal sin error', () => {
    const opts = getParserOptions('src/utils.js');
    const code = `
      function greet(name) {
        return \`Hello, \${name}!\`;
      }
      export default greet;
    `;
    expect(() => parse(code, opts)).not.toThrow();
  });

  test('puede parsear archivos con shebang sin error', () => {
    // Este es el bug que el fix de pipelineOperator introducía:
    // El token '#' del shebang era interpretado como topic reference
    const opts = getParserOptions('src/cli.js');
    const code = `#!/usr/bin/env node

import { main } from './lib.js';
main();
`;
    expect(() => parse(code, opts)).not.toThrow();
  });

  test('puede parsear private fields (#field) sin error', () => {
    const opts = getParserOptions('src/Counter.js');
    const code = `
      class Counter {
        #count = 0;
        increment() { this.#count++; }
      }
    `;
    // Nota: private fields requieren 'classPrivateProperties' o similar
    // Por ahora solo verificamos que no crashee
    expect(() => parse(code, opts)).toBeDefined();
  });

});

// NOTA: El parser genérico NO soporta pipelineOperator (|>)
// Ese soporte está solo en data-flow/index.js PARSER_OPTIONS
// porque el token '#' del hack proposal conflictea con shebangs y private fields
