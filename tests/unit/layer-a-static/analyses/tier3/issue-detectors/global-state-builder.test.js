/**
 * @fileoverview global-state-builder.test.js
 *
 * Tests para el builder de estado global
 *
 * @module tests/unit/layer-b-semantic/issue-detectors/global-state-builder
 */

import { describe, it, expect } from 'vitest';
import { buildGlobalState } from '#layer-a/analyses/tier3/issue-detectors/global-state-builder.js';

/**
 * Builder para crear estructuras de enrichedResults en tests
 * Patrón Fluent Builder para reducir duplicidad y mejorar legibilidad
 */
class EnrichedResultsBuilder {
  constructor() {
    this.files = {};
  }

  /**
   * Agrega un archivo con análisis semántico
   * @param {string} filePath - Ruta del archivo
   * @param {Object} options - Configuración del análisis
   * @param {string[]} [options.reads] - Lecturas de estado compartido
   * @param {string[]} [options.writes] - Escrituras de estado compartido
   * @param {string[]} [options.readProperties] - Propiedades leídas (alternativa)
   * @param {string[]} [options.writeProperties] - Propiedades escritas (alternativa)
   * @param {string[]} [options.eventEmitters] - Emisores de eventos
   * @param {string[]} [options.eventListeners] - Escuchadores de eventos
   * @returns {EnrichedResultsBuilder}
   */
  addFile(filePath, options = {}) {
    const semanticAnalysis = {};

    if (options.reads || options.writes || options.readProperties || options.writeProperties) {
      semanticAnalysis.sharedState = {};
      if (options.reads) semanticAnalysis.sharedState.reads = options.reads;
      if (options.writes) semanticAnalysis.sharedState.writes = options.writes;
      if (options.readProperties) semanticAnalysis.sharedState.readProperties = options.readProperties;
      if (options.writeProperties) semanticAnalysis.sharedState.writeProperties = options.writeProperties;
    }

    if (options.eventEmitters || options.eventListeners) {
      semanticAnalysis.eventPatterns = {};
      if (options.eventEmitters) semanticAnalysis.eventPatterns.eventEmitters = options.eventEmitters;
      if (options.eventListeners) semanticAnalysis.eventPatterns.eventListeners = options.eventListeners;
    }

    this.files[filePath] = Object.keys(semanticAnalysis).length > 0 ? { semanticAnalysis } : {};
    return this;
  }

  /**
   * Agrega un archivo vacío (sin semanticAnalysis)
   * @param {string} filePath
   * @returns {EnrichedResultsBuilder}
   */
  addEmptyFile(filePath) {
    this.files[filePath] = {};
    return this;
  }

  /**
   * Agrega un archivo con análisis personalizado
   * @param {string} filePath
   * @param {Object} customAnalysis
   * @returns {EnrichedResultsBuilder}
   */
  addFileWithAnalysis(filePath, customAnalysis) {
    this.files[filePath] = customAnalysis;
    return this;
  }

  /**
   * Construye el objeto enrichedResults
   * @returns {Object}
   */
  build() {
    return { files: this.files };
  }

  /**
   * Construye un objeto enrichedResults vacío
   * @returns {Object}
   */
  static empty() {
    return { files: {} };
  }

  /**
   * Construye un objeto sin propiedad files
   * @returns {Object}
   */
  static withoutFiles() {
    return {};
  }

  /**
   * Construye un objeto con files null
   * @returns {Object}
   */
  static withNullFiles() {
    return { files: null };
  }
}

/**
 * Helper para crear builders rápidamente
 * @returns {EnrichedResultsBuilder}
 */
const createResults = () => new EnrichedResultsBuilder();

describe('issue-detectors/global-state-builder', () => {
  describe('buildGlobalState', () => {
    describe('Empty State', () => {
      it('should return empty state for empty results', () => {
        const result = buildGlobalState(EnrichedResultsBuilder.empty());

        expect(result.sharedState.reads).toEqual({});
        expect(result.sharedState.writes).toEqual({});
        expect(result.events.emitters).toEqual({});
        expect(result.events.listeners).toEqual({});
        expect(result.files).toEqual({});
      });

      it('should handle missing files', () => {
        const result = buildGlobalState(EnrichedResultsBuilder.withoutFiles());

        expect(result.sharedState.reads).toEqual({});
        expect(result.sharedState.writes).toEqual({});
      });

      it('should handle null files', () => {
        const result = buildGlobalState(EnrichedResultsBuilder.withNullFiles());

        expect(result.sharedState.reads).toEqual({});
        expect(result.sharedState.writes).toEqual({});
      });
    });

    describe('Shared State - Reads', () => {
      it('should index single shared state read', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file1.js', { reads: ['window.gameState', 'window.user'] })
            .build()
        );

        expect(result.sharedState.reads['window.gameState']).toContain('src/file1.js');
        expect(result.sharedState.reads['window.user']).toContain('src/file1.js');
      });

      it('should aggregate multiple files for same read', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file1.js', { reads: ['window.state'] })
            .addFile('src/file2.js', { reads: ['window.state'] })
            .build()
        );

        expect(result.sharedState.reads['window.state']).toContain('src/file1.js');
        expect(result.sharedState.reads['window.state']).toContain('src/file2.js');
        expect(result.sharedState.reads['window.state'].length).toBe(2);
      });

      it('should handle alternative readProperties field', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file.js', { readProperties: ['window.alt'] })
            .build()
        );

        expect(result.sharedState.reads['window.alt']).toContain('src/file.js');
      });
    });

    describe('Shared State - Writes', () => {
      it('should index single shared state write', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file1.js', { writes: ['window.config'] })
            .build()
        );

        expect(result.sharedState.writes['window.config']).toContain('src/file1.js');
      });

      it('should handle alternative writeProperties field', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file.js', { writeProperties: ['window.alt'] })
            .build()
        );

        expect(result.sharedState.writes['window.alt']).toContain('src/file.js');
      });
    });

    describe('Event Patterns', () => {
      it('should index event emitters', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/button.js', { eventEmitters: ['user:click'] })
            .build()
        );

        expect(result.events.emitters['user:click']).toContain('src/button.js');
      });

      it('should index multiple event listeners', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/analytics.js', { eventListeners: ['user:click', 'app:init'] })
            .build()
        );

        expect(result.events.listeners['user:click']).toContain('src/analytics.js');
        expect(result.events.listeners['app:init']).toContain('src/analytics.js');
      });

      it('should aggregate multiple files for same event emitter', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/button1.js', { eventEmitters: ['user:click'] })
            .addFile('src/button2.js', { eventEmitters: ['user:click'] })
            .build()
        );

        expect(result.events.emitters['user:click'].length).toBe(2);
        expect(result.events.emitters['user:click']).toContain('src/button1.js');
        expect(result.events.emitters['user:click']).toContain('src/button2.js');
      });
    });

    describe('File References', () => {
      it('should store file analysis reference', () => {
        const fileAnalysis = {
          semanticAnalysis: { sharedState: { reads: [] } }
        };

        const result = buildGlobalState(
          createResults()
            .addFileWithAnalysis('src/file.js', fileAnalysis)
            .build()
        );

        expect(result.files['src/file.js']).toBe(fileAnalysis);
      });
    });

    describe('Edge Cases - Missing Properties', () => {
      it('should handle missing semanticAnalysis', () => {
        const result = buildGlobalState(
          createResults()
            .addEmptyFile('src/file.js')
            .build()
        );

        expect(result.sharedState.reads).toEqual({});
        expect(result.sharedState.writes).toEqual({});
      });

      it('should handle missing sharedState', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file.js', {})
            .build()
        );

        expect(result.sharedState.reads).toEqual({});
        expect(result.sharedState.writes).toEqual({});
      });

      it('should handle missing eventPatterns', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file.js', {})
            .build()
        );

        expect(result.events.emitters).toEqual({});
        expect(result.events.listeners).toEqual({});
      });
    });

    describe('Edge Cases - Empty Arrays', () => {
      it('should handle empty arrays for all properties', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/file.js', {
              reads: [],
              writes: [],
              eventEmitters: [],
              eventListeners: []
            })
            .build()
        );

        expect(result.sharedState.reads).toEqual({});
        expect(result.sharedState.writes).toEqual({});
        expect(result.events.emitters).toEqual({});
        expect(result.events.listeners).toEqual({});
      });
    });

    describe('Complex Scenarios', () => {
      it('should handle complex state with both reads and writes', () => {
        const result = buildGlobalState(
          createResults()
            .addFile('src/reader.js', { reads: ['window.shared'] })
            .addFile('src/writer.js', { writes: ['window.shared'] })
            .build()
        );

        expect(result.sharedState.reads['window.shared']).toContain('src/reader.js');
        expect(result.sharedState.writes['window.shared']).toContain('src/writer.js');
      });
    });
  });
});
