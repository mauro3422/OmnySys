/**
 * @fileoverview pipeline.test.js
 *
 * Unit tests for InitializationPipeline
 * Tests the Command pattern that orchestrates server init steps.
 *
 * Cubre:
 * - execute() success flow (all steps pass)
 * - execute() halts when shouldExecute() returns false
 * - execute() rollback when a step throws
 * - Pipeline counts only executable steps in progress log
 * - rollback is called in reverse order
 *
 * @module tests/unit/layer-c/mcp/pipeline
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { InitializationPipeline } from '#layer-c/mcp/core/initialization/pipeline.js';
import { InitializationStep } from '#layer-c/mcp/core/initialization/steps/base-step.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Crea un mock step configurable
 */
function makeStep(name, {
  execute = async () => true,
  rollback = async () => {},
  shouldExecute = () => true
} = {}) {
  const step = new InitializationStep(name);
  step.execute = vi.fn(execute);
  step.rollback = vi.fn(rollback);
  step.shouldExecute = vi.fn(shouldExecute);
  return step;
}

/** Servidor mock mínimo */
function makeServer(overrides = {}) {
  return { projectPath: '/test/project', initialized: false, ...overrides };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InitializationPipeline', () => {

  // ── Construcción ────────────────────────────────────────────────────────────

  test('se puede construir con array de steps', () => {
    const pipeline = new InitializationPipeline([makeStep('a'), makeStep('b')]);
    expect(pipeline.steps).toHaveLength(2);
    expect(pipeline.completedSteps).toHaveLength(0);
  });

  test('se puede construir con array vacío', () => {
    const pipeline = new InitializationPipeline([]);
    expect(pipeline.steps).toHaveLength(0);
  });

  // ── execute() success ────────────────────────────────────────────────────────

  test('execute() retorna { success: true } cuando todos los steps pasan', async () => {
    const pipeline = new InitializationPipeline([
      makeStep('step-1'),
      makeStep('step-2'),
      makeStep('step-3')
    ]);
    const result = await pipeline.execute(makeServer());
    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(3);
  });

  test('execute() llama a cada step en orden', async () => {
    const callOrder = [];
    const step1 = makeStep('first', { execute: async () => { callOrder.push('first'); return true; } });
    const step2 = makeStep('second', { execute: async () => { callOrder.push('second'); return true; } });
    const step3 = makeStep('third', { execute: async () => { callOrder.push('third'); return true; } });

    const pipeline = new InitializationPipeline([step1, step2, step3]);
    await pipeline.execute(makeServer());

    expect(callOrder).toEqual(['first', 'second', 'third']);
  });

  test('execute() pasa la instancia server a cada step', async () => {
    const server = makeServer({ customProp: 'test-value' });
    let receivedServer;

    const step = makeStep('capture', {
      execute: async (s) => { receivedServer = s; return true; }
    });

    const pipeline = new InitializationPipeline([step]);
    await pipeline.execute(server);

    expect(receivedServer).toBe(server);
    expect(receivedServer.customProp).toBe('test-value');
  });

  // ── shouldExecute() filtering ────────────────────────────────────────────────

  test('execute() omite steps donde shouldExecute() retorna false', async () => {
    const skippedStep = makeStep('skipped', { shouldExecute: () => false });
    const executedStep = makeStep('executed');

    const pipeline = new InitializationPipeline([skippedStep, executedStep]);
    const result = await pipeline.execute(makeServer());

    expect(skippedStep.execute).not.toHaveBeenCalled();
    expect(executedStep.execute).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(1); // Solo 1 completado (el que ejecutó)
  });

  test('execute() cuenta correctamente los steps a ejecutar', async () => {
    const steps = [
      makeStep('run-1'),
      makeStep('skip-1', { shouldExecute: () => false }),
      makeStep('run-2'),
      makeStep('skip-2', { shouldExecute: () => false }),
      makeStep('run-3')
    ];

    const pipeline = new InitializationPipeline(steps);
    const result = await pipeline.execute(makeServer());

    expect(result.completedSteps).toBe(3);
  });

  // ── halt (step retorna false) ────────────────────────────────────────────────

  test('execute() se detiene y retorna { success: false } cuando un step retorna false', async () => {
    const callOrder = [];
    const pipeline = new InitializationPipeline([
      makeStep('step-1', { execute: async () => { callOrder.push('step-1'); return true; } }),
      makeStep('step-halt', { execute: async () => { callOrder.push('step-halt'); return false; } }),
      makeStep('step-3', { execute: async () => { callOrder.push('step-3'); return true; } })
    ]);

    const result = await pipeline.execute(makeServer());

    expect(result.success).toBe(false);
    expect(result.haltedAt).toBe('step-halt');
    expect(callOrder).toEqual(['step-1', 'step-halt']); // step-3 nunca ejecuta
  });

  // ── rollback ─────────────────────────────────────────────────────────────────

  test('execute() llama rollback cuando un step lanza excepción', async () => {
    const step1 = makeStep('ok-step');
    const step2 = makeStep('fail-step', {
      execute: async () => { throw new Error('Step failed'); }
    });
    const step3 = makeStep('never-runs');

    const pipeline = new InitializationPipeline([step1, step2, step3]);
    const result = await pipeline.execute(makeServer());

    expect(result.success).toBe(false);
    expect(result.failedAt).toBe('fail-step');
    expect(result.error.message).toBe('Step failed');

    // Rollback del step completado (step1)
    expect(step1.rollback).toHaveBeenCalledOnce();
    // step3 nunca ejecutó, no hace rollback
    expect(step3.rollback).not.toHaveBeenCalled();
    // step2 falló, no se hace rollback de él (sólo de completedSteps)
    expect(step2.rollback).not.toHaveBeenCalled();
  });

  test('rollback se llama en orden inverso', async () => {
    const rollbackOrder = [];
    const step1 = makeStep('first', { rollback: async () => rollbackOrder.push('first') });
    const step2 = makeStep('second', { rollback: async () => rollbackOrder.push('second') });
    const step3 = makeStep('fail', { execute: async () => { throw new Error('fail'); } });

    const pipeline = new InitializationPipeline([step1, step2, step3]);
    await pipeline.execute(makeServer());

    // Orden inverso: second → first
    expect(rollbackOrder).toEqual(['second', 'first']);
  });

  test('rollback continúa aunque un rollback falle', async () => {
    const rollbackOrder = [];
    const step1 = makeStep('first', { rollback: async () => rollbackOrder.push('first') });
    const step2 = makeStep('second', {
      rollback: async () => { throw new Error('Rollback failed'); }
    });
    const step3 = makeStep('fail', { execute: async () => { throw new Error('fail'); } });

    const pipeline = new InitializationPipeline([step1, step2, step3]);
    // No debe lanzar aunque el rollback falle
    const result = await pipeline.execute(makeServer());

    expect(result.success).toBe(false);
    expect(rollbackOrder).toContain('first'); // first sí se rollbackeó
  });

  // ── Propiedades de resultado ─────────────────────────────────────────────────

  test('result.completedSteps refleja cuántos steps terminaron OK', async () => {
    const pipeline = new InitializationPipeline([
      makeStep('a'),
      makeStep('b'),
      makeStep('c')
    ]);

    const result = await pipeline.execute(makeServer());
    expect(result.completedSteps).toBe(3);
  });

  test('result.completedSteps es 0 si el primer step falla', async () => {
    const pipeline = new InitializationPipeline([
      makeStep('fail', { execute: async () => { throw new Error('fail'); } }),
      makeStep('never')
    ]);

    const result = await pipeline.execute(makeServer());
    expect(result.success).toBe(false);
    expect(result.completedSteps).toBe(0);
  });
});

// ─── InitializationStep base class ───────────────────────────────────────────

describe('InitializationStep (base class)', () => {
  test('se puede instanciar con nombre', () => {
    const step = new InitializationStep('my-step');
    expect(step.name).toBe('my-step');
  });

  test('execute() abstracto lanza Error si no se sobreescribe', async () => {
    const step = new InitializationStep('abstract');
    await expect(step.execute({})).rejects.toThrow('must implement execute()');
  });

  test('shouldExecute() retorna true por defecto', () => {
    const step = new InitializationStep('default');
    expect(step.shouldExecute({})).toBe(true);
  });

  test('rollback() por defecto no lanza', async () => {
    const step = new InitializationStep('default');
    await expect(step.rollback({}, new Error('test'))).resolves.not.toThrow();
  });
});
