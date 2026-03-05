/**
 * @fileoverview shared-state.test.js
 * 
 * Tests para detector de problemas con shared state
 * 
 * @module tests/unit/layer-a-static/analyses/tier3/issue-detectors/shared-state
 */

import { describe, it, expect } from 'vitest';
import {
  detectUndefinedSharedState,
  detectDeadSharedState
} from '#layer-a/analyses/tier3/issue-detectors/shared-state.js';

/**
 * Builder para crear objetos GlobalState de forma fluida
 * @class
 */
class GlobalStateBuilder {
  constructor() {
    this.reads = {};
    this.writes = {};
  }

  /**
   * Agrega una lectura al estado global
   * @param {string} property - Nombre de la propiedad
   * @param {string[]} readers - Lista de archivos que leen
   * @returns {GlobalStateBuilder}
   */
  withRead(property, readers) {
    this.reads[property] = Array.isArray(readers) ? readers : [readers];
    return this;
  }

  /**
   * Agrega una escritura al estado global
   * @param {string} property - Nombre de la propiedad
   * @param {string[]} writers - Lista de archivos que escriben
   * @returns {GlobalStateBuilder}
   */
  withWrite(property, writers) {
    this.writes[property] = Array.isArray(writers) ? writers : [writers];
    return this;
  }

  /**
   * Agrega múltiples lecturas
   * @param {Object<string, string[]>} readsMap - Mapa de propiedades a lectores
   * @returns {GlobalStateBuilder}
   */
  withReads(readsMap) {
    Object.entries(readsMap).forEach(([prop, readers]) => {
      this.reads[prop] = readers;
    });
    return this;
  }

  /**
   * Agrega múltiples escrituras
   * @param {Object<string, string[]>} writesMap - Mapa de propiedades a escritores
   * @returns {GlobalStateBuilder}
   */
  withWrites(writesMap) {
    Object.entries(writesMap).forEach(([prop, writers]) => {
      this.writes[prop] = writers;
    });
    return this;
  }

  /**
   * Construye el objeto GlobalState
   * @returns {Object}
   */
  build() {
    return {
      sharedState: {
        reads: { ...this.reads },
        writes: { ...this.writes }
      }
    };
  }

  /**
   * Construye un estado vacío
   * @returns {Object}
   */
  static empty() {
    return {
      sharedState: {
        reads: {},
        writes: {}
      }
    };
  }
}

/**
 * Factory para crear casos de prueba de issues
 * @namespace
 */
const IssueFactory = {
  /**
   * Crea un issue de undefined shared state
   * @param {string} property - Propiedad no definida
   * @param {string[]} readers - Lectores
   * @returns {Object}
   */
  undefinedState(property, readers) {
    return {
      type: 'undefined-shared-state',
      property,
      readers,
      severity: 'high',
      suggestion: expect.stringContaining('Initialize')
    };
  },

  /**
   * Crea un issue de dead shared state
   * @param {string} property - Propiedad muerta
   * @param {string[]} writers - Escritores
   * @returns {Object}
   */
  deadState(property, writers) {
    return {
      type: 'dead-shared-state',
      property,
      writers,
      severity: 'low',
      suggestion: expect.stringContaining('Remove')
    }
  }
};

describe('issue-detectors/shared-state', () => {
  describe('detectUndefinedSharedState', () => {
    const buildState = (reads, writes) => 
      new GlobalStateBuilder()
        .withReads(reads)
        .withWrites(writes)
        .build();

    it('should return empty array when no reads', () => {
      const globalState = GlobalStateBuilder.empty();
      const result = detectUndefinedSharedState(globalState);
      expect(result).toEqual([]);
    });

    it('should detect undefined shared state', () => {
      const globalState = buildState({ 'window.config': ['reader.js'] }, {});
      const result = detectUndefinedSharedState(globalState);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(IssueFactory.undefinedState('window.config', ['reader.js']));
    });

    it('should not report defined shared state', () => {
      const globalState = buildState(
        { 'window.config': ['reader.js'] },
        { 'window.config': ['writer.js'] }
      );
      
      expect(detectUndefinedSharedState(globalState)).toEqual([]);
    });

    it('should include readers in issue', () => {
      const globalState = buildState(
        { 'window.config': ['file1.js', 'file2.js'] },
        {}
      );
      
      const result = detectUndefinedSharedState(globalState);
      expect(result[0].readers).toEqual(['file1.js', 'file2.js']);
    });

    it('should have high severity', () => {
      const globalState = buildState({ 'window.config': ['reader.js'] }, {});
      const result = detectUndefinedSharedState(globalState);
      expect(result[0].severity).toBe('high');
    });

    it('should include suggestion', () => {
      const globalState = buildState({ 'window.config': ['reader.js'] }, {});
      const result = detectUndefinedSharedState(globalState);
      expect(result[0].suggestion).toContain('Initialize');
    });

    it('should detect multiple undefined properties', () => {
      const globalState = buildState(
        {
          'window.prop1': ['file1.js'],
          'window.prop2': ['file2.js']
        },
        {}
      );
      
      expect(detectUndefinedSharedState(globalState)).toHaveLength(2);
    });

    it('should handle empty writers array', () => {
      const globalState = buildState(
        { 'window.config': ['reader.js'] },
        { 'window.config': [] }
      );
      
      expect(detectUndefinedSharedState(globalState)).toHaveLength(1);
    });
  });

  describe('detectDeadSharedState', () => {
    const buildState = (reads, writes) => 
      new GlobalStateBuilder()
        .withReads(reads)
        .withWrites(writes)
        .build();

    it('should return empty array when no writes', () => {
      const globalState = GlobalStateBuilder.empty();
      expect(detectDeadSharedState(globalState)).toEqual([]);
    });

    it('should detect dead shared state', () => {
      const globalState = buildState({}, { 'window.temp': ['writer.js'] });
      const result = detectDeadSharedState(globalState);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(IssueFactory.deadState('window.temp', ['writer.js']));
    });

    it('should not report used shared state', () => {
      const globalState = buildState(
        { 'window.config': ['reader.js'] },
        { 'window.config': ['writer.js'] }
      );
      
      expect(detectDeadSharedState(globalState)).toEqual([]);
    });

    it('should include writers in issue', () => {
      const globalState = buildState(
        {},
        { 'window.temp': ['file1.js', 'file2.js'] }
      );
      
      const result = detectDeadSharedState(globalState);
      expect(result[0].writers).toEqual(['file1.js', 'file2.js']);
    });

    it('should have low severity', () => {
      const globalState = buildState({}, { 'window.temp': ['writer.js'] });
      const result = detectDeadSharedState(globalState);
      expect(result[0].severity).toBe('low');
    });

    it('should include suggestion', () => {
      const globalState = buildState({}, { 'window.temp': ['writer.js'] });
      const result = detectDeadSharedState(globalState);
      expect(result[0].suggestion).toContain('Remove');
    });

    it('should detect multiple dead properties', () => {
      const globalState = buildState(
        {},
        {
          'window.prop1': ['file1.js'],
          'window.prop2': ['file2.js']
        }
      );
      
      expect(detectDeadSharedState(globalState)).toHaveLength(2);
    });

    it('should handle empty readers array', () => {
      const globalState = buildState(
        { 'window.config': [] },
        { 'window.config': ['writer.js'] }
      );
      
      expect(detectDeadSharedState(globalState)).toHaveLength(1);
    });
  });
});
