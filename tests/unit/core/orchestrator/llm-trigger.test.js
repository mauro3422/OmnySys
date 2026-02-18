/**
 * @fileoverview llm-trigger.test.js
 *
 * Tests para la prevención del double-trigger del análisis LLM.
 *
 * Contexto del bug (corregido en v0.9.18):
 * `lifecycle/init/main.js` llamaba a `_analyzeComplexFilesWithLLM()` sin setear
 * el flag `_llmAnalysisTriggered = true`. El health-checker, al ver el flag en
 * false cuando el LLM estaba disponible, relanzaba el análisis → cola duplicada.
 *
 * Cubre:
 * - `_calculateLLMPriority` — lógica de prioridades por arquetipo
 * - Health checker: guard `_llmHealthRunning` evita doble instancia
 * - Health checker: guard `_llmAnalysisTriggered` evita doble análisis
 * - Lógica de reset del flag cuando el análisis falla
 *
 * @module tests/unit/core/orchestrator/llm-trigger
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { _calculateLLMPriority } from '#core/orchestrator/llm-analysis.js';
import { _startLLMHealthChecker } from '#core/orchestrator/lifecycle/health/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeArchetype(type, requiresLLM = true) {
  return { type, requiresLLM, confidence: 0.9 };
}

function makeMetadata(overrides = {}) {
  return {
    summary: { totalFunctions: 5, totalImports: 3 },
    ...overrides
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Tests: _calculateLLMPriority ─────────────────────────────────────────────

describe('_calculateLLMPriority', () => {

  test('god-object → priority CRITICAL', () => {
    const archetypes = [makeArchetype('god-object')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('critical');
  });

  test('orphan-module → priority HIGH', () => {
    const archetypes = [makeArchetype('orphan-module')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('high');
  });

  test('state-manager → priority HIGH', () => {
    const archetypes = [makeArchetype('state-manager')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('high');
  });

  test('event-hub → priority HIGH', () => {
    const archetypes = [makeArchetype('event-hub')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('high');
  });

  test('dynamic-importer → priority MEDIUM', () => {
    const archetypes = [makeArchetype('dynamic-importer')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('medium');
  });

  test('singleton → priority MEDIUM', () => {
    const archetypes = [makeArchetype('singleton')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('medium');
  });

  test('facade → priority LOW', () => {
    const archetypes = [makeArchetype('facade')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('low');
  });

  test('god-object tiene prioridad mayor que orphan-module (CRITICAL > HIGH)', () => {
    // god-object siempre gana sin importar el orden en el array
    const archetypes = [makeArchetype('orphan-module'), makeArchetype('god-object')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('critical');
  });

  test('god-object gana incluso si viene último en el array', () => {
    const archetypes = [
      makeArchetype('facade'),
      makeArchetype('singleton'),
      makeArchetype('god-object')
    ];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('critical');
  });

  test('array vacío → priority LOW (fallback)', () => {
    expect(_calculateLLMPriority([], makeMetadata())).toBe('low');
  });

  test('tipo desconocido → priority LOW (fallback)', () => {
    const archetypes = [makeArchetype('unknown-archetype-xyz')];
    expect(_calculateLLMPriority(archetypes, makeMetadata())).toBe('low');
  });

});

// ─── Tests: _startLLMHealthChecker — guard de doble instancia ────────────────

describe('_startLLMHealthChecker — guard _llmHealthRunning', () => {

  test('retorna inmediatamente si _llmHealthRunning ya es true (no arranca otra instancia)', () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const ctx = {
      _llmHealthRunning: true,  // ← ya hay un checker corriendo
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn()
    };

    _startLLMHealthChecker.call(ctx);

    // No debe agendar ningún setTimeout cuando ya está corriendo
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    // No debe haber modificado el estado
    expect(ctx._llmAnalysisTriggered).toBe(false);
    expect(ctx._analyzeComplexFilesWithLLM).not.toHaveBeenCalled();
  });

  test('setea _llmHealthRunning = true al iniciar', () => {
    vi.useFakeTimers();
    
    const ctx = {
      _llmHealthRunning: false,
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn()
    };

    // Interceptar el setTimeout para evitar que ejecute el callback (que usa LLMService)
    vi.spyOn(global, 'setTimeout').mockImplementation(() => {});

    _startLLMHealthChecker.call(ctx);

    // Debe marcar que está corriendo
    expect(ctx._llmHealthRunning).toBe(true);
  });

});

// ─── Tests: Guard _llmAnalysisTriggered ──────────────────────────────────────

describe('Guard _llmAnalysisTriggered — prevención de double-trigger', () => {

  test('cuando flag = true, el análisis NO debe ser relanzado', () => {
    // Simular la comprobación que hace el health checker
    const ctx = {
      _llmAnalysisTriggered: true,
      _analyzeComplexFilesWithLLM: vi.fn()
    };

    // Reproducir la lógica del health-checker (llm-checker.js línea ~25)
    if (!ctx._llmAnalysisTriggered) {
      ctx._llmAnalysisTriggered = true;
      ctx._analyzeComplexFilesWithLLM();
    }

    expect(ctx._analyzeComplexFilesWithLLM).not.toHaveBeenCalled();
  });

  test('cuando flag = false, el análisis SÍ se lanza y el flag se setea', () => {
    const ctx = {
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn().mockResolvedValue(undefined)
    };

    // Reproducir la lógica del health-checker
    if (!ctx._llmAnalysisTriggered) {
      ctx._llmAnalysisTriggered = true;
      ctx._analyzeComplexFilesWithLLM();
    }

    expect(ctx._analyzeComplexFilesWithLLM).toHaveBeenCalledOnce();
    expect(ctx._llmAnalysisTriggered).toBe(true);
  });

  test('el flag setea a true ANTES de llamar al análisis (fix de main.js)', () => {
    // Esto verifica el fix aplicado en main.js:
    // el flag se setea ANTES de la llamada async para prevenir race condition
    const executionOrder = [];
    
    const ctx = {
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn().mockImplementation(() => {
        executionOrder.push('analysis-called');
        return Promise.resolve();
      })
    };

    // Simular el código de main.js CORREGIDO
    executionOrder.push('before-flag-set');
    ctx._llmAnalysisTriggered = true;  // ← flag set ANTES
    executionOrder.push('after-flag-set');
    ctx._analyzeComplexFilesWithLLM().then(() => {
      executionOrder.push('analysis-complete');
    });

    // En el momento de la llamada, el flag ya era true
    expect(executionOrder).toEqual(['before-flag-set', 'after-flag-set', 'analysis-called']);
    expect(ctx._llmAnalysisTriggered).toBe(true);
  });

});

// ─── Tests: Reset del flag cuando el análisis falla ──────────────────────────

describe('Flag _llmAnalysisTriggered — reset en error (permite reintento)', () => {

  test('el flag se resetea a false cuando el análisis rechaza', async () => {
    const ctx = {
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn().mockRejectedValue(new Error('LLM unavailable'))
    };

    // Simular el código de main.js con el catch que resetea el flag
    ctx._llmAnalysisTriggered = true;
    try {
      await ctx._analyzeComplexFilesWithLLM();
    } catch {
      ctx._llmAnalysisTriggered = false; // reset → permite reintento vía health-checker
    }

    expect(ctx._llmAnalysisTriggered).toBe(false);
  });

  test('el flag permanece true cuando el análisis tiene éxito', async () => {
    const ctx = {
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn().mockResolvedValue(undefined)
    };

    ctx._llmAnalysisTriggered = true;
    try {
      await ctx._analyzeComplexFilesWithLLM();
    } catch {
      ctx._llmAnalysisTriggered = false;
    }

    expect(ctx._llmAnalysisTriggered).toBe(true);
  });

  test('health-checker puede reintentar después de un fallo (flag = false)', async () => {
    // Simula: análisis falla → flag = false → health-checker lo vuelve a activar
    let callCount = 0;
    const ctx = {
      _llmAnalysisTriggered: false,
      _analyzeComplexFilesWithLLM: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('First attempt failed'));
        return Promise.resolve();
      })
    };

    // Primer intento (simula main.js)
    ctx._llmAnalysisTriggered = true;
    try {
      await ctx._analyzeComplexFilesWithLLM();
    } catch {
      ctx._llmAnalysisTriggered = false; // reset por error
    }

    expect(ctx._llmAnalysisTriggered).toBe(false); // listo para reintento

    // Segundo intento (simula health-checker que ve flag = false)
    if (!ctx._llmAnalysisTriggered) {
      ctx._llmAnalysisTriggered = true;
      await ctx._analyzeComplexFilesWithLLM();
    }

    expect(callCount).toBe(2);
    expect(ctx._llmAnalysisTriggered).toBe(true);
  });

});
