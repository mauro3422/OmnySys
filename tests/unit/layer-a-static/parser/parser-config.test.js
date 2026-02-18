/**
 * @fileoverview parser-config.test.js
 *
 * Tests para getBabelPlugins / getParserOptions en parser/config.js.
 *
 * Cubre (v0.9.19 fix - Bug 1):
 * - pipelineOperator debe usar proposal 'hack' con topicToken '#' 
 *   (no 'minimal' que no soporta el token #)
 * - El parser debe poder parsear código con |> y # sin error
 *
 * @module tests/unit/layer-a-static/parser/parser-config
 */

import { describe, test, expect } from 'vitest';
import { getBabelPlugins, getParserOptions } from '#layer-a/parser/config.js';
import { parse } from '@babel/parser';

// ─── Tests: Configuración ─────────────────────────────────────────────────────

describe('getBabelPlugins — configuración de pipelineOperator', () => {

  test('incluye pipelineOperator con proposal hack', () => {
    const plugins = getBabelPlugins('src/file.js');
    
    const pipelinePlugin = plugins.find(
      p => Array.isArray(p) && p[0] === 'pipelineOperator'
    );

    expect(pipelinePlugin).toBeDefined();
    expect(pipelinePlugin[1].proposal).toBe('hack');
    expect(pipelinePlugin[1].topicToken).toBe('#');
  });

  test('NO usa proposal minimal', () => {
    const plugins = getBabelPlugins('src/file.js');

    const pipelinePlugin = plugins.find(
      p => Array.isArray(p) && p[0] === 'pipelineOperator'
    );

    expect(pipelinePlugin).toBeDefined();
    expect(pipelinePlugin[1].proposal).not.toBe('minimal');
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

describe('parser/config.js — integración con Babel (Bug 1 regresión)', () => {

  test('puede parsear código con pipeline operator |> y token # sin error', () => {
    const opts = getParserOptions('src/omnysystem.js');
    
    const code = `
      const double = x => x * 2;
      const result = 5 |> double(#);
    `;

    expect(() => parse(code, opts)).not.toThrow();
  });

  test('puede parsear múltiples pipelines con # sin error', () => {
    const opts = getParserOptions('src/omnysystem.js');

    const code = `
      export const pipeline = (data) =>
        data
          |> normalize(#)
          |> validate(#)
          |> transform(#);
    `;

    expect(() => parse(code, opts)).not.toThrow();
  });

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

});
