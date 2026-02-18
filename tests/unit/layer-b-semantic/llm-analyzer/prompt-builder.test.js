/**
 * @fileoverview prompt-builder.test.js
 *
 * Tests para la función buildPrompt en llm-analyzer/prompt-builder.js.
 *
 * Cubre (v0.9.19 fix):
 * - Bug 3: el catch block usaba error.message (puede ser "") en lugar de error.stack
 * - Que el fallback siempre retorna un objeto con las 3 propiedades esperadas
 * - Que el prompt engine válido retorna el prompt generado
 *
 * @module tests/unit/layer-b-semantic/llm-analyzer/prompt-builder
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mockeamos promptEngine para controlar qué retorna
vi.mock('#layer-b/prompt-engine/index.js', () => {
  return {
    default: {
      generatePrompt: vi.fn(),
      validatePrompt: vi.fn()
    }
  };
});

vi.mock('#utils/logger.js', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  })
}));

import { buildPrompt } from '#layer-b/llm-analyzer/prompt-builder.js';
import promptEngine from '#layer-b/prompt-engine/index.js';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildPrompt — happy path', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('retorna el prompt generado por el engine cuando todo va bien', async () => {
    promptEngine.generatePrompt.mockResolvedValue({
      systemPrompt: 'You are a code analyzer.',
      userPrompt: 'Analyze this code.',
      analysisType: 'complex'
    });
    promptEngine.validatePrompt.mockReturnValue(undefined);

    const result = await buildPrompt('const x = 1;', 'test.js', {}, {});

    expect(result.systemPrompt).toBe('You are a code analyzer.');
    expect(result.userPrompt).toBe('Analyze this code.');
    expect(result.analysisType).toBe('complex');
  });

  test('pasa metadata al engine cuando se provee', async () => {
    const metadata = { complexity: 'high', functions: 5 };
    promptEngine.generatePrompt.mockResolvedValue({
      systemPrompt: 'sys',
      userPrompt: 'usr',
      analysisType: 'default'
    });

    await buildPrompt('code', 'file.js', {}, {}, metadata);

    expect(promptEngine.generatePrompt).toHaveBeenCalledWith(metadata, 'code');
  });

  test('usa {} cuando metadata es null', async () => {
    promptEngine.generatePrompt.mockResolvedValue({
      systemPrompt: 'sys',
      userPrompt: 'usr',
      analysisType: 'default'
    });

    await buildPrompt('code', 'file.js', {}, {}, null);

    expect(promptEngine.generatePrompt).toHaveBeenCalledWith({}, 'code');
  });

});

describe('buildPrompt — fallback cuando falla el engine (Bug 3)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('retorna fallback cuando el engine lanza TypeError (con error.message vacío)', async () => {
    // TypeError con mensaje vacío — el bug original: logger.error(..., error.message) → ""
    const err = new TypeError();
    err.message = '';
    promptEngine.generatePrompt.mockRejectedValue(err);

    const result = await buildPrompt('code', 'problem.js', {}, {});

    // Fallback debe funcionar correctamente
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userPrompt');
    expect(result).toHaveProperty('analysisType');
    expect(result.analysisType).toBe('default');
    expect(result.systemPrompt).toContain('code analyzer');
  });

  test('retorna fallback cuando generatePrompt rechaza con Error normal', async () => {
    promptEngine.generatePrompt.mockRejectedValue(new Error('schema not found'));

    const result = await buildPrompt('const x = 1;', 'broken.js', {}, {});

    expect(result.analysisType).toBe('default');
    expect(typeof result.systemPrompt).toBe('string');
    expect(typeof result.userPrompt).toBe('string');
  });

  test('retorna fallback cuando validatePrompt lanza', async () => {
    promptEngine.generatePrompt.mockResolvedValue({
      systemPrompt: 'sys',
      userPrompt: 'usr',
      analysisType: 'test'
    });
    promptEngine.validatePrompt.mockImplementation(() => {
      throw new Error('invalid prompt');
    });

    const result = await buildPrompt('code', 'file.js', {}, {});

    expect(result.analysisType).toBe('default');
  });

  test('el fallback incluye el código en el userPrompt', async () => {
    promptEngine.generatePrompt.mockRejectedValue(new Error('fail'));
    const code = 'const answer = 42;';

    const result = await buildPrompt(code, 'file.js', {}, {});

    expect(result.userPrompt).toContain(code);
  });

  test('no lanza excepción aunque el engine falle', async () => {
    promptEngine.generatePrompt.mockRejectedValue(new Error('catastrophic failure'));

    await expect(buildPrompt('code', 'file.js', {}, {})).resolves.toBeDefined();
  });

  test('retorna fallback cuando systemPrompt no es string', async () => {
    promptEngine.generatePrompt.mockResolvedValue({
      systemPrompt: 42,   // invalid type
      userPrompt: 'usr',
      analysisType: 'test'
    });
    promptEngine.validatePrompt.mockReturnValue(undefined);

    const result = await buildPrompt('code', 'file.js', {}, {});

    // Debe caer al fallback porque systemPrompt no es string
    expect(result.analysisType).toBe('default');
  });

});
