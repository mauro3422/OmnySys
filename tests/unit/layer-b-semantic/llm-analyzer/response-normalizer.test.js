/**
 * @fileoverview response-normalizer.test.js
 *
 * Tests para el normalizador de respuestas LLM.
 *
 * Contexto:
 * El normalizador aplica un umbral de confianza (`confidenceThreshold`) para
 * filtrar respuestas del LLM. Si la confianza de la respuesta está por debajo
 * del umbral, retorna null (descarta la respuesta).
 *
 * Problema observado en runtime:
 * Casi todos los archivos muestran `⚠️ LLM confidence too low (0.5)` porque el
 * LLM local devuelve confidence=0.5 (resultado de `||` fallback, no del LLM real).
 * El umbral default en `normalizeResponse` es 0.7, por lo que 0.5 < 0.7 → null.
 *
 * Cubre:
 * - Filtra respuestas con confidence < threshold (retorna null)
 * - Acepta respuestas con confidence >= threshold
 * - Maneja el fallback de confidence: response.analysisResult.confidence → response.confidence → 0.8
 * - Descarta respuestas con error o rawResponse
 * - Normaliza campos de arrays (affectedFiles, suggestedConnections, etc.)
 * - Normaliza campos de sharedState y events
 * - extractValidFilePaths extrae paths válidos del contexto
 *
 * @module tests/unit/layer-b-semantic/llm-analyzer/response-normalizer
 */

import { describe, test, expect } from 'vitest';
import {
  normalizeResponse,
  normalizeSharedStateFromSimple,
  extractValidFilePaths
} from '#layer-b/llm-analyzer/response-normalizer.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeValidResponse(overrides = {}) {
  return {
    confidence: 0.9,
    reasoning: 'This file manages state',
    connectionType: 'shared-state',
    connectedFiles: ['src/store.js'],
    suggestedConnections: [],
    hiddenConnections: [],
    ...overrides
  };
}

// ─── Tests: Filtrado por confidence threshold ─────────────────────────────────

describe('normalizeResponse — filtrado por confidence threshold', () => {

  test('retorna null cuando confidence < threshold (0.5 < 0.7)', () => {
    const response = makeValidResponse({ confidence: 0.5 });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result).toBeNull();
  });

  test('retorna null cuando confidence == 0.5 con threshold default 0.7', () => {
    // Este es el caso más común en runtime — LLM devuelve 0.5
    const response = makeValidResponse({ confidence: 0.5 });
    const result = normalizeResponse(response, 'src/test.js');
    expect(result).toBeNull();
  });

  test('retorna respuesta normalizada cuando confidence >= threshold', () => {
    const response = makeValidResponse({ confidence: 0.9 });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result).not.toBeNull();
    expect(result.confidence).toBe(0.9);
  });

  test('acepta confidence exactamente igual al threshold', () => {
    const response = makeValidResponse({ confidence: 0.7 });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    // confidence 0.7 con threshold 0.7: 0.7 < 0.7 es false → debería pasar
    // Pero el check es `if (normalized.confidence < confidenceThreshold)` → false → pasa
    expect(result).not.toBeNull();
  });

  test('retorna null cuando confidence es 0.0', () => {
    const response = makeValidResponse({ confidence: 0.0 });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result).toBeNull();
  });

  test('acepta confidence 1.0 (máxima confianza)', () => {
    const response = makeValidResponse({ confidence: 1.0 });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result).not.toBeNull();
    expect(result.confidence).toBe(1.0);
  });

  test('threshold personalizado: 0.5 acepta respuestas con confidence 0.6', () => {
    const response = makeValidResponse({ confidence: 0.6 });
    const result = normalizeResponse(response, 'src/test.js', 0.5);
    expect(result).not.toBeNull();
  });

  test('threshold personalizado: 0.95 rechaza respuestas con confidence 0.9', () => {
    const response = makeValidResponse({ confidence: 0.9 });
    const result = normalizeResponse(response, 'src/test.js', 0.95);
    expect(result).toBeNull();
  });

});

// ─── Tests: Fallback de confidence ────────────────────────────────────────────

describe('normalizeResponse — fallback de confidence', () => {

  test('usa confidence de analysisResult si existe', () => {
    const response = {
      ...makeValidResponse({ confidence: 0.5 }), // confidence baja en raíz
      analysisResult: { confidence: 0.95 }        // alta en analysisResult
    };
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    // analysisResult.confidence (0.95) tiene prioridad sobre response.confidence (0.5)
    expect(result).not.toBeNull();
    expect(result.confidence).toBe(0.95);
  });

  test('usa response.confidence si no hay analysisResult', () => {
    const response = makeValidResponse({ confidence: 0.85 });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result.confidence).toBe(0.85);
  });

  test('usa 0.8 como default si no hay confidence en ningún lugar', () => {
    const response = {
      reasoning: 'Test',
      connectionType: 'none'
      // Sin campo confidence
    };
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    // 0.8 >= 0.7 → no debe ser null
    expect(result).not.toBeNull();
    expect(result.confidence).toBe(0.8);
  });

});

// ─── Tests: Descarte de respuestas inválidas ──────────────────────────────────

describe('normalizeResponse — descarte de respuestas inválidas', () => {

  test('retorna null para respuesta null', () => {
    expect(normalizeResponse(null, 'src/test.js')).toBeNull();
  });

  test('retorna null para respuesta undefined', () => {
    expect(normalizeResponse(undefined, 'src/test.js')).toBeNull();
  });

  test('retorna null cuando response.error existe', () => {
    const response = { error: 'LLM timeout' };
    expect(normalizeResponse(response, 'src/test.js')).toBeNull();
  });

  test('retorna null cuando response.rawResponse existe (texto no-JSON)', () => {
    const response = { rawResponse: 'This is a text response, not JSON' };
    expect(normalizeResponse(response, 'src/test.js')).toBeNull();
  });

});

// ─── Tests: Normalización de campos ──────────────────────────────────────────

describe('normalizeResponse — normalización de campos', () => {

  test('normaliza connectedFiles a affectedFiles', () => {
    const response = makeValidResponse({
      confidence: 0.9,
      connectedFiles: ['src/store.js', 'src/api.js'],
      affectedFiles: undefined
    });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result.affectedFiles).toContain('src/store.js');
  });

  test('affectedFiles es array vacío si no hay connected/affected files', () => {
    const response = makeValidResponse({ confidence: 0.9 });
    delete response.connectedFiles;
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(Array.isArray(result.affectedFiles)).toBe(true);
  });

  test('suggestedConnections es array vacío si no existe', () => {
    const response = makeValidResponse({ confidence: 0.9 });
    delete response.suggestedConnections;
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(Array.isArray(result.suggestedConnections)).toBe(true);
  });

  test('hiddenConnections es array vacío si no existe', () => {
    const response = makeValidResponse({ confidence: 0.9 });
    delete response.hiddenConnections;
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(Array.isArray(result.hiddenConnections)).toBe(true);
  });

  test('source siempre es "llm"', () => {
    const result = normalizeResponse(makeValidResponse({ confidence: 0.9 }), 'src/test.js', 0.7);
    expect(result.source).toBe('llm');
  });

  test('connectionType se preserva', () => {
    const response = makeValidResponse({ confidence: 0.9, connectionType: 'event-bridge' });
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result.connectionType).toBe('event-bridge');
  });

  test('connectionType default es "none" si no existe', () => {
    const response = makeValidResponse({ confidence: 0.9 });
    delete response.connectionType;
    const result = normalizeResponse(response, 'src/test.js', 0.7);
    expect(result.connectionType).toBe('none');
  });

});

// ─── Tests: normalizeSharedStateFromSimple ────────────────────────────────────

describe('normalizeSharedStateFromSimple', () => {

  test('convierte keys de localStorage a sharedState', () => {
    const result = normalizeSharedStateFromSimple(['theme', 'userId'], 'localStorage');
    expect(result.reads).toEqual(['theme', 'userId']);
    expect(result.writes).toEqual(['theme', 'userId']);
  });

  test('retorna reads/writes vacíos para connectionType no-localStorage', () => {
    const result = normalizeSharedStateFromSimple(['key'], 'event-bridge');
    expect(result.reads).toEqual([]);
    expect(result.writes).toEqual([]);
  });

  test('retorna reads/writes vacíos para keys vacías', () => {
    const result = normalizeSharedStateFromSimple([], 'localStorage');
    expect(result.reads).toEqual([]);
    expect(result.writes).toEqual([]);
  });

  test('retorna reads/writes vacíos para keys null', () => {
    const result = normalizeSharedStateFromSimple(null, 'localStorage');
    expect(result.reads).toEqual([]);
    expect(result.writes).toEqual([]);
  });

});

// ─── Tests: extractValidFilePaths ────────────────────────────────────────────

describe('extractValidFilePaths', () => {

  test('extrae paths del projectContext', () => {
    const context = {
      fileSpecific: {
        allProjectFiles: [
          { path: 'src/a.js' },
          { path: 'src/b.js' },
          { path: 'src/c.js' }
        ]
      }
    };
    const paths = extractValidFilePaths(context);
    expect(paths).toEqual(['src/a.js', 'src/b.js', 'src/c.js']);
  });

  test('retorna array vacío para contexto null', () => {
    expect(extractValidFilePaths(null)).toEqual([]);
  });

  test('retorna array vacío para contexto undefined', () => {
    expect(extractValidFilePaths(undefined)).toEqual([]);
  });

  test('retorna array vacío si no hay allProjectFiles', () => {
    expect(extractValidFilePaths({ fileSpecific: {} })).toEqual([]);
  });

  test('omite archivos sin propiedad path', () => {
    const context = {
      fileSpecific: {
        allProjectFiles: [
          { path: 'src/a.js' },
          { name: 'no-path.js' }, // sin path
          { path: 'src/c.js' }
        ]
      }
    };
    const paths = extractValidFilePaths(context);
    expect(paths).toEqual(['src/a.js', 'src/c.js']);
    expect(paths).toHaveLength(2);
  });

});
